/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';
import { Student, AttendanceRecord } from '../types';
import { ShieldCheckIcon, Loader2, StarIcon } from './Icons';

const LATE_LIMIT = '07:30';
const CHECKOUT_LIMIT = '16:00';

type PointSummary = {
  studentId: string;
  namaLengkap: string;
  idUnik?: string;
  className: string;
  score: number;
  lateCount: number;
  missingCheckoutCount: number;
  absenceCount: number;
  hadirCount: number;
};

const toMinute = (time?: string | null) => {
  if (!time) return null;
  const parsed = String(time).split(' | ')[0];
  const [h, m] = parsed.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const PointsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('10 A');
  const [dayRange, setDayRange] = useState(30);

  useEffect(() => {
    if (isMockMode) {
      setStudents([
        { id: 's1', namaLengkap: 'ADELIA SRI', idUnik: '25002', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan', isClaimed: false },
        { id: 's2', namaLengkap: 'AHMAD FAJAR', idUnik: '25003', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Laki-laki', isClaimed: false }
      ] as Student[]);
      setAttendance([
        { id: 'a1', studentId: 's1', studentName: 'ADELIA SRI', class: '10 A', date: '2026-01-10', month: '2026-01', status: 'Hadir', checkIn: '07:20:00', duha: '09:00:00', zuhur: '12:00:00', ashar: '15:00:00', checkOut: '16:10:00' },
        { id: 'a2', studentId: 's1', studentName: 'ADELIA SRI', class: '10 A', date: '2026-01-11', month: '2026-01', status: 'Hadir', checkIn: '07:50:00', duha: null, zuhur: null, ashar: null, checkOut: null },
        { id: 'a3', studentId: 's2', studentName: 'AHMAD FAJAR', class: '10 A', date: '2026-01-10', month: '2026-01', status: 'Hadir', checkIn: '07:35:00', duha: null, zuhur: null, ashar: null, checkOut: '15:40:00' },
      ] as AttendanceRecord[]);
      setLoading(false);
      return;
    }

    if (!db) return;

    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayRange + 1);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const unsubStudents = db
      .collection('students')
      .where('status', '==', 'Aktif')
      .onSnapshot((snap) => {
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
      });

    const unsubAttendance = db
      .collection('attendance')
      .where('date', '>=', startDateStr)
      .onSnapshot((snap) => {
        setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        setLoading(false);
      }, () => setLoading(false));

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [dayRange]);

  const classOptions = useMemo(() => {
    const classes = Array.from(new Set(students.map((s) => s.tingkatRombel).filter(Boolean))) as string[];
    if (!classes.includes('10 A')) classes.unshift('10 A');
    return classes;
  }, [students]);

  const summaries = useMemo<PointSummary[]>(() => {
    const startMinutes = toMinute(LATE_LIMIT) || 450;
    const checkoutLimit = toMinute(CHECKOUT_LIMIT) || 960;

    const targetStudents = students.filter((s) => s.tingkatRombel === selectedClass);
    const attendanceByStudent = new Map<string, AttendanceRecord[]>();
    const trackedDates = new Set<string>();

    attendance
      .filter((a) => a.class === selectedClass)
      .forEach((a) => {
        if (a.date) trackedDates.add(a.date);
        const list = attendanceByStudent.get(a.studentId) || [];
        list.push(a);
        attendanceByStudent.set(a.studentId, list);
      });

    return targetStudents.map((student) => {
      const records = attendanceByStudent.get(student.id || '') || [];
      const recordDates = new Set(records.map((r) => r.date).filter(Boolean));

      let score = 100;
      let lateCount = 0;
      let missingCheckoutCount = 0;
      let absenceCount = 0;
      let hadirCount = 0;

      records.forEach((r) => {
        if (r.status === 'Hadir') hadirCount += 1;

        const inMinute = toMinute(r.checkIn);
        if (inMinute && inMinute > startMinutes) {
          lateCount += 1;
          score -= 2;
        }

        const outMinute = toMinute(r.checkOut);
        if (!r.checkOut) {
          missingCheckoutCount += 1;
          score -= 1;
        } else if (outMinute && outMinute < checkoutLimit) {
          missingCheckoutCount += 1;
          score -= 1;
        }

        if (r.status === 'Alpha') score -= 5;
        if (r.status === 'Sakit' || r.status === 'Izin') score -= 1;
      });

      // Penalize days where class attendance exists but this student has no record.
      // In production data, attendance docs are created only when scanned/updated.
      absenceCount = Math.max(0, trackedDates.size - recordDates.size);
      if (absenceCount > 0) {
        score -= absenceCount * 5;
      }

      if (hadirCount >= 20) score += 5;
      if (hadirCount >= 10 && lateCount === 0) score += 3;

      score = Math.max(0, Math.min(100, score));

      return {
        studentId: student.id || '',
        namaLengkap: student.namaLengkap,
        idUnik: student.idUnik,
        className: student.tingkatRombel || '-',
        score,
        lateCount,
        missingCheckoutCount,
        absenceCount,
        hadirCount,
      };
    }).sort((a, b) => b.score - a.score);
  }, [students, attendance, selectedClass]);

  const avgScore = summaries.length > 0
    ? Math.round(summaries.reduce((acc, item) => acc + item.score, 0) / summaries.length)
    : 0;

  return (
    <Layout
      title="Disiplin & Poin"
      subtitle="Terhubung otomatis ke Data Siswa + Presensi"
      icon={ShieldCheckIcon}
      onBack={onBack}
    >
      <div className="p-4 lg:p-6 pb-32 space-y-4">
        <div className="bg-white dark:bg-[#151E32] rounded-[1.8rem] border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black outline-none"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Rentang Hari</label>
              <select
                value={dayRange}
                onChange={(e) => setDayRange(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black outline-none"
              >
                <option value={7}>7 Hari</option>
                <option value={30}>30 Hari</option>
                <option value={90}>90 Hari</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl">
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Rata-rata Poin Kelas</span>
            <span className="text-[14px] font-black text-indigo-700">{avgScore}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-30" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#151E32] rounded-[1.8rem] border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada data poin untuk kelas ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((item, idx) => (
              <div key={item.studentId || item.idUnik || idx} className="bg-white dark:bg-[#151E32] p-4 rounded-[1.6rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 truncate">{idx + 1}. {item.namaLengkap}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">ID: {item.idUnik || '-'} • {item.className}</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                      <StarIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black">{item.score}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Hadir</p>
                    <p className="text-[11px] font-black text-emerald-600">{item.hadirCount}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Terlambat</p>
                    <p className="text-[11px] font-black text-amber-600">{item.lateCount}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Checkout Minus</p>
                    <p className="text-[11px] font-black text-rose-600">{item.missingCheckoutCount}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Tanpa Presensi</p>
                    <p className="text-[11px] font-black text-rose-700">{item.absenceCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PointsView;
