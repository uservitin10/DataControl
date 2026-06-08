const s = 'S+úri';
console.log(JSON.stringify(s));
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  console.log(i, c, c.codePointAt(0).toString(16));
}
console.log('utf8 bytes', Buffer.from(s, 'utf8').toJSON().data.map(x => x.toString(16)));
console.log('latin1 bytes', Buffer.from(s, 'latin1').toJSON().data.map(x => x.toString(16)));
