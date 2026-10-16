import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  enabled: { type: Boolean, default: false },
  sendTime: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  timezone: { type: String, default: 'Asia/Kolkata' },
  subject: { type: String, default: 'Happy birthday, {{firstName}}! 🎂', maxlength: 180 },
  bodyHtml: { type: String, default: '<div style="font-family:Arial,sans-serif;background:#08080a;color:#fff;padding:32px;border-radius:16px"><div style="border-left:4px solid #ff2a2a;padding:4px 0 4px 20px"><img src="{{logoUrl}}" alt="The Impeccables" width="120" style="display:block;margin-bottom:20px"><p style="color:#ff5555;letter-spacing:.18em;text-transform:uppercase">The Impeccables</p><h1>Happy Birthday, {{firstName}}!</h1><p>Wishing you a year filled with creativity, good people, and moments worth celebrating.</p><p>Keep creating, collaborating, and celebrating. We are glad you are part of {{clubName}}.</p><p style="color:#aaa;font-size:12px">{{year}} · {{domain}}</p></div></div>', maxlength: 20000 },
  bodyText: { type: String, default: 'Happy birthday, {{firstName}}! Wishing you a year filled with creativity, good people, and moments worth celebrating. We are glad you are part of {{clubName}}.', maxlength: 20000 },
  templateVariables: { type: [String], default: ['firstName', 'fullName', 'domain', 'clubName', 'year'] },
  includeClubSignature: { type: Boolean, default: true },
  ccAdmins: { type: Boolean, default: false },
  notifyInApp: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const BirthdaySettings = mongoose.models.BirthdaySettings || mongoose.model('BirthdaySettings', schema);
export default BirthdaySettings;
