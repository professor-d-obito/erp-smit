import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export interface RowError {
  rowNumber: number;
  registerNumber: string;
  field: string;
  error: string;
}

export interface IngestionResult {
  success: boolean;
  totalRows: number;
  savedEntries: number;
  errors: RowError[];
  warnings?: string[];
}

export class AssessmentIngestionService {
  /**
   * Generates a pre-formatted Excel template for assessment mark entry
   */
  static async generateEvaluationTemplate(assessmentId: string): Promise<Buffer> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: { co: true },
          orderBy: { questionNumber: 'asc' },
        },
        assignment: {
          include: {
            subject: true,
            roster: {
              include: { student: true },
              orderBy: { student: { rollNumber: 'asc' } },
            },
          },
        },
      },
    });

    if (!assessment) throw new Error('Assessment not found');

    const headers = [
      'Register Number',
      'Roll Number',
      'Student Name',
      ...assessment.questions.map(
        (q) => `${q.questionNumber} [${q.co.code} - Max ${q.maxMarks}M]`
      ),
    ];

    const dataRows = assessment.assignment.roster.map((r) => [
      r.student.rollNumber,
      r.student.rollNumber,
      r.student.name,
      ...assessment.questions.map(() => ''), // Empty for entry
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Apply column styling and width
    worksheet['!cols'] = [
      { wch: 18 }, // Register Number
      { wch: 14 }, // Roll Number
      { wch: 28 }, // Name
      ...assessment.questions.map(() => ({ wch: 18 })),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MarkEntry');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Ingests, validates, and persists offline mark sheets from buffer
   */
  static async ingestMarksFromBuffer(
    assessmentId: string,
    buffer: Buffer
  ): Promise<IngestionResult> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        assignment: {
          include: {
            roster: { include: { student: true } },
          },
        },
      },
    });

    if (!assessment) throw new Error('Assessment record not found');
    if (assessment.isLocked) throw new Error('Assessment is locked for editing');

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Spreadsheet has no sheets');

    const rawRows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (rawRows.length < 2) {
      throw new Error('Spreadsheet must contain headers and at least one student row');
    }

    const headerRow = rawRows[0].map((h: any) => String(h || '').trim());
    const dataRows = rawRows.slice(1);

    // Map questions to column indices
    const questionColumnMap: { questionId: string; maxMarks: number; colIndex: number; qNum: string }[] = [];
    for (const q of assessment.questions) {
      const colIndex = headerRow.findIndex((col) => {
        const lowerCol = col.toLowerCase();
        const lowerQ = q.questionNumber.toLowerCase();
        return lowerCol.startsWith(lowerQ) || lowerCol.includes(`[${lowerQ}]`) || lowerCol.startsWith(`${lowerQ} `);
      });

      if (colIndex === -1) {
        throw new Error(`Missing expected column in spreadsheet for question: ${q.questionNumber}`);
      }

      questionColumnMap.push({
        questionId: q.id,
        maxMarks: q.maxMarks,
        colIndex,
        qNum: q.questionNumber,
      });
    }

    // Map students in roster
    const rosterMap = new Map<string, string>(); // rollNumber -> rosterId
    for (const r of assessment.assignment.roster) {
      rosterMap.set(r.student.rollNumber.trim().toUpperCase(), r.id);
    }

    const errors: RowError[] = [];
    const validEntries: {
      questionId: string;
      rosterId: string;
      marksObtained: number | null;
      isAbsent: boolean;
      isMalpractice: boolean;
    }[] = [];

    // Row-by-row validation
    dataRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rawReg = String(row[0] || '').trim().toUpperCase();
      if (!rawReg) return; // Skip empty rows

      const rosterId = rosterMap.get(rawReg);
      if (!rosterId) {
        errors.push({
          rowNumber: rowNum,
          registerNumber: rawReg,
          field: 'Register Number',
          error: `Student (${rawReg}) is not enrolled in this course roster`,
        });
        return;
      }

      for (const qMap of questionColumnMap) {
        const rawVal = row[qMap.colIndex];
        const strVal = String(rawVal ?? '').trim().toUpperCase();

        let marks: number | null = null;
        let isAbsent = false;
        let isMalpractice = false;

        if (strVal === '' || strVal === 'ABS' || strVal === 'A' || strVal === 'ABSENT') {
          isAbsent = true;
        } else if (strVal === 'MAL' || strVal === 'MP' || strVal === 'MALPRACTICE') {
          isMalpractice = true;
        } else {
          const num = Number(strVal);
          if (isNaN(num)) {
            errors.push({
              rowNumber: rowNum,
              registerNumber: rawReg,
              field: qMap.qNum,
              error: `Invalid mark "${strVal}". Must be numeric, "ABS", or "MAL"`,
            });
            continue;
          }
          if (num < 0 || num > qMap.maxMarks) {
            errors.push({
              rowNumber: rowNum,
              registerNumber: rawReg,
              field: qMap.qNum,
              error: `Mark ${num} exceeds maximum allowed (${qMap.maxMarks}M)`,
            });
            continue;
          }
          marks = num;
        }

        validEntries.push({
          questionId: qMap.questionId,
          rosterId,
          marksObtained: marks,
          isAbsent,
          isMalpractice,
        });
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        totalRows: dataRows.length,
        savedEntries: 0,
        errors,
      };
    }

    // Persist records atomically
    await prisma.$transaction(
      validEntries.map((entry) =>
        prisma.markEntry.upsert({
          where: {
            questionId_rosterId: {
              questionId: entry.questionId,
              rosterId: entry.rosterId,
            },
          },
          create: entry,
          update: entry,
        })
      )
    );

    return {
      success: true,
      totalRows: dataRows.length,
      savedEntries: validEntries.length,
      errors: [],
    };
  }
}
