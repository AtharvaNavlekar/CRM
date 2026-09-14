const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let serverContent = fs.readFileSync(serverFile, 'utf8');

const callCheck = `
    const compliance = await validateLeadCommunicationCompliance(lead as any, 'Call', { timestamp: timestamp ? new Date(timestamp) : new Date() });
    if (!compliance.allowed) {
      return res.status(compliance.statusCode || 403).json({ error: compliance.reason, code: compliance.code, details: compliance.details });
    }
`;

const messageCheck = `
    const compliance = await validateLeadCommunicationCompliance(lead as any, channel === 'sms' ? 'SMS' : 'WhatsApp', { timestamp: new Date() });
    if (!compliance.allowed) {
      return res.status(compliance.statusCode || 403).json({ error: compliance.reason, code: compliance.code, details: compliance.details });
    }
`;

// Insert into /api/calls
const callTarget = `    const lead = leads[0];

    const newCall = {`;
serverContent = serverContent.replace(callTarget, `    const lead = leads[0];\n${callCheck}\n    const newCall = {`);

// Insert into /api/messages
const messageTarget = `    const lead = leads[0];

    const newMsg = {`;
serverContent = serverContent.replace(messageTarget, `    const lead = leads[0];\n${messageCheck}\n    const newMsg = {`);

fs.writeFileSync(serverFile, serverContent);

const complianceFile = path.join(__dirname, '..', 'server', 'compliance.ts');
let compContent = fs.readFileSync(complianceFile, 'utf8');
compContent = compContent.replace(`code: 'OPT_OUT',`, `code: 'LEAD_OPTED_OUT',`);
compContent = compContent.replace(`ruleViolated: 'OPT_OUT'`, `ruleViolated: 'LEAD_OPTED_OUT'`);
fs.writeFileSync(complianceFile, compContent);

console.log('Fixed compliance');
