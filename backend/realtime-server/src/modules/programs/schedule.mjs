/** Civil dates and duration policy, shared by server and browser. */
export function parseDuration(value) {
  if (value && typeof value === 'object') {
    const quantity=Number(value.quantity), unit=value.unit;
    return Number.isSafeInteger(quantity)&&quantity>0&&['months','weeks','days'].includes(unit)?{quantity,unit}:null;
  }
  const match=String(value||'').trim().match(/^(\d+)\s*(?:calendar\s+)?(months?|weeks?|days?)$/i);
  return match?parseDuration({quantity:Number(match[1]),unit:match[2].toLowerCase().replace(/s?$/,'s')}):null;
}
export function durationLabel(value) {const d=parseDuration(value);return d?`${d.quantity} ${d.unit==='months'?'calendar ':''}${d.quantity===1?d.unit.slice(0,-1):d.unit}`:'Duration requires review';}
export function civilToday(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validCivilDate(value) {const d=new Date(`${value}T00:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function completionDate(startOn,duration) {
  const d=parseDuration(duration);if(!d||!validCivilDate(startOn))throw new Error('Choose a valid start date and a structured program duration.');
  const date=new Date(`${startOn}T00:00:00Z`);
  if(d.unit==='months') {const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+d.quantity);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));date.setUTCDate(date.getUTCDate()-1);}
  else date.setUTCDate(date.getUTCDate()+d.quantity*(d.unit==='weeks'?7:1)-1);
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()>9999)throw new Error('The internship duration is too large.');
  return date.toISOString().slice(0,10);
}
export function scheduleDisplay(schedule) {return {duration:schedule?.durationLabel||durationLabel(schedule?.duration),startDate:displayDate(schedule?.startOn),completionDate:displayDate(schedule?.endOn)};}
export function displayDate(value) {return validCivilDate(value)?new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}):'To be confirmed in your offer';}
export function legacyDuration(startOn,endOn) {return validCivilDate(startOn)&&validCivilDate(endOn)?`${Math.round((Date.parse(endOn)-Date.parse(startOn))/86400000)+1} days (recorded schedule)`:'Recorded schedule requires review';}
export function scheduleMismatch(offer,config) {try{return Boolean(offer?.startOn&&completionDate(offer.startOn,config?.durationSpec||config?.duration)!==offer.endOn);}catch{return Boolean(offer);}}
