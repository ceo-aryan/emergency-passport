/* Every database call lives here, so UI files never touch Firestore directly.

   Collections (see firestore.rules for who may read/write what):
   users/{uid}                      full private passport (owner only)
   emergency/{pid}                  emergency summary, readable only with the exact random ID (the QR)
   lookup/{hash}                    SHA-256(phone|dob) -> passport ID (phone + date of birth lookup)
   staff/{uid}                      doctor/hospital profile + approval status
   admins/{uid}                     admins (created by hand in the console)
   codes/{uid}/active/{code}        6-digit code the patient shares (valid 10 minutes)
   access/{uid_docUid}              proof that a doctor entered a valid code (valid 30 minutes)
   accessLog/{id}                   who opened which patient's records, and when
   history/{uid}/entries/{id}       medical history, added only by verified doctors (never edited or deleted)
   donors/{uid}                     blood donor profile (shown to logged-in users who search) */
import { auth, db, A, F } from "./firebase.js";

const hex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
const sha = async s => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
const newId = () => hex(crypto.getRandomValues(new Uint8Array(12)));
const ref = (...path) => F.doc(db, ...path);
const col = (...path) => F.collection(db, ...path);
const one = s => (s.exists() ? s.data() : null);
const rows = s => s.docs.map(d => ({ id: d.id, ...d.data() }));

/* ---------- accounts ---------- */
export const onAuth = cb => A.onAuthStateChanged(auth, cb);
export const login = (email, pass) => A.signInWithEmailAndPassword(auth, email, pass);
export const signup = (email, pass) => A.createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => A.signOut(auth);

/* ---------- patient passport ---------- */
export async function myPassport() { return one(await F.getDoc(ref("users", auth.currentUser.uid))); }

export async function savePassport(p) {
  const uid = auth.currentUser.uid, old = await myPassport();
  const pid = (old && old.pid) || newId(), hash = await sha(p.phone + "|" + p.dob);
  await F.setDoc(ref("users", uid), { ...p, pid, hash });
  await F.setDoc(ref("emergency", pid), {
    ownerUid: uid, name: p.name, yob: p.dob.slice(0, 4), blood: p.blood,
    allergy: p.allergy, cond: p.cond, meds: p.meds, cname: p.cname, cphone: p.cphone, crel: p.crel
  });
  await F.setDoc(ref("lookup", hash), { ownerUid: uid, pid });
  if (old && old.hash && old.hash !== hash) await F.deleteDoc(ref("lookup", old.hash));
  return pid;
}

export async function getEmergency(pid) { return one(await F.getDoc(ref("emergency", pid))); }

export async function lookup(phone, dob) {
  const l = await F.getDoc(ref("lookup", await sha(phone + "|" + dob)));
  return l.exists() ? getEmergency(l.data().pid) : null;
}

/* ---------- patient: share code, history, access log ---------- */
export async function createShareCode() {
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await F.setDoc(ref("codes", auth.currentUser.uid, "active", code), { createdAt: F.serverTimestamp() });
  return code;
}

export async function historyOf(uid) {   // used by the patient (own) and by a doctor who has access
  return rows(await F.getDocs(F.query(col("history", uid, "entries"), F.orderBy("createdAt", "desc"))));
}

export async function myAccessLog() {
  const list = rows(await F.getDocs(F.query(col("accessLog"), F.where("uid", "==", auth.currentUser.uid))));
  return list.sort((a, b) => ((b.at && b.at.seconds) || 0) - ((a.at && a.at.seconds) || 0));
}

/* ---------- doctors and hospitals ---------- */
export async function registerStaff(email, pass, profile) {
  const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
  await F.setDoc(ref("staff", cred.user.uid), { ...profile, email, status: "pending", createdAt: F.serverTimestamp() });
}
export async function myStaff() { return one(await F.getDoc(ref("staff", auth.currentUser.uid))); }

async function grant(patientUid, staff, access, logExtra) {   // the grant and its log entry are written together; the rules require both
  const b = F.writeBatch(db), me = auth.currentUser.uid, logId = newId();
  b.set(ref("access", patientUid + "_" + me), { uid: patientUid, docUid: me, logId, createdAt: F.serverTimestamp(), ...access });
  b.set(ref("accessLog", logId), { uid: patientUid, docUid: me, docName: staff.name, hospital: staff.hospital || "", at: F.serverTimestamp(), ...logExtra });
  await b.commit();   // wrong code => the rules reject everything, nothing is logged
}
export const unlock = (uid, code, staff) => grant(uid, staff, { mode: "code", code }, { mode: "code" });
export const emergencyUnlock = (uid, reason, staff) => grant(uid, staff, { mode: "emergency", reason }, { mode: "emergency", reason });

export const addEntry = (patientUid, e, staff) => F.addDoc(col("history", patientUid, "entries"), {
  ...e, doctorUid: auth.currentUser.uid, doctorName: staff.name, hospital: staff.hospital || "", createdAt: F.serverTimestamp()
});

/* ---------- admin ---------- */
export async function isAdmin() { return (await F.getDoc(ref("admins", auth.currentUser.uid))).exists(); }
export async function pendingStaff() { return rows(await F.getDocs(F.query(col("staff"), F.where("status", "==", "pending")))); }
export const setStaffStatus = (uid, status) => F.updateDoc(ref("staff", uid), { status });

/* ---------- blood donors ---------- */
export const saveDonor = d => F.setDoc(ref("donors", auth.currentUser.uid), d);
export async function myDonor() { return one(await F.getDoc(ref("donors", auth.currentUser.uid))); }
export const removeDonor = () => F.deleteDoc(ref("donors", auth.currentUser.uid));
export async function findDonors(cityKey) {   // equality filters only, so no extra database index is needed
  return rows(await F.getDocs(F.query(col("donors"), F.where("cityKey", "==", cityKey), F.where("available", "==", true))));
}
