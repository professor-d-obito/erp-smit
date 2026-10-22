const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

async function generate() {
  const certDir = path.join(__dirname, '..', 'certificates');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const keyPath = path.join(certDir, 'localhost-key.pem');
  const certPath = path.join(certDir, 'localhost.pem');

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'SMIT College ERP' },
    { name: 'countryName', value: 'IN' },
  ];

  console.log('Generating self-signed SSL certificate for localhost...');
  const pems = await selfsigned.generate(attrs, {
    algorithm: 'sha256',
    days: 365,
    keySize: 2048,
    extensions: [
      {
        name: 'basicConstraints',
        cA: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
        ],
      },
    ],
  });

  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);

  console.log(`✅ SSL Certificates generated successfully:`);
  console.log(`   Key:  ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
}

generate().catch(console.error);
