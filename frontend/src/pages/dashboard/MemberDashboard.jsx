import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, LoadingCards, StatCard } from '../../components/ui/DesignPrimitives';
import api, { apiErrorMessage } from '../../services/api';
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock3, ListTodo, Sparkles,
  TrendingUp, UploadCloud,
} from 'lucide-react';

const shortName = (user) => user?.firstName || user?.name?.split(' ')[0] || 'there';
const dueDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'No deadline';

export const MemberDashboard = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user, role } = useSelector((state) => state.auth);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get('/posts/mine'), api.get('/tasks'), api.get('/meetings'), api.get('/attendance/me'), api.get('/groups')]).then((results) => {
      if (!active) return;
      const [posts, tasks, meetings, attendance, groups] = results;
      if (posts.status === 'fulfilled') setMySubmissions(posts.value.data.data.items.map((post) => ({ ...post, id: post._id, domainName: post.domain?.name || '', date: new Date(post.updatedAt).toLocaleDateString(), mediaUrl: post.media?.[0]?.url || '', thumbnail: post.media?.[0]?.thumbnailUrl || post.media?.[0]?.url || '' })));
      if (tasks.status === 'fulfilled') setMyTasks(tasks.value.data.data.items);
      if (meetings.status === 'fulfilled') setNextMeeting(meetings.value.data.data.find((meeting) => new Date(meeting.date) >= new Date()) || null);
      if (attendance.status === 'fulfilled') setAttendanceRate(attendance.value.data.data.summary.rate);
      const bannerKey = `groups-welcome-seen:${user?.id || user?._id || 'member'}`;
      if (groups.status === 'fulfilled' && !(groups.value.data.data || []).some((group) => group.myRole) && !localStorage.getItem(bannerKey)) {
        setShowJoinGroup(true);
        localStorage.setItem(bannerKey, 'true');
      }
      const firstFailure = results.find((result) => result.status === 'rejected');
      if (firstFailure) setLoadError(apiErrorMessage(firstFailure.reason, 'Some dashboard information could not be loaded.'));
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, user?._id]);

  const approvedCount = mySubmissions.filter((submission) => submission.status === 'approved' || submission.status === 'published').length;
  const pendingCount = mySubmissions.filter((submission) => submission.status === 'under_review').length;
  const changesCount = mySubmissions.filter((submission) => submission.status === 'changes_requested').length;
  const motionProps = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };
  const domainName = user?.domain || user?.domains?.[0]?.name || '';

  return (
    <div className="space-y-6 text-gray-100 sm:space-y-8">
      {showJoinGroup && <Card className="flex flex-wrap items-center justify-between gap-4 border-red-500/25 bg-red-950/15 px-5 py-4"><div><p className="font-medium text-white">Join your domain group to get meeting updates</p><p className="mt-1 text-sm text-gray-400">Browse groups and request to join one.</p></div><Button onClick={() => navigate('/dashboard/groups')}>Browse groups <ArrowRight size={15} /></Button></Card>}

      <motion.section {...motionProps} className="dashboard-hero relative isolate overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-7">
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-red-300"><Sparkles size={13} />{role === 'member' ? 'Member workspace' : `${String(role || '').replaceAll('_', ' ')} workspace`}</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Good to see you, <span className="text-red-400">{shortName(user)}</span></h1>
            <p className="mt-2 text-sm text-gray-300">{domainName ? `Your ${domainName} workspace and updates.` : 'Your tasks, meetings and creative updates.'}</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><p className="text-right text-xs text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p><Button variant="glow" size="sm" icon={UploadCloud} onClick={() => navigate('/dashboard/submit')}>New submission</Button></div>
        </div>
      </motion.section>

      {loadError && <ErrorState title="Dashboard information is incomplete" description={loadError} onRetry={() => window.location.reload()} className="py-6" />}

      {loading ? <LoadingCards count={4} className="lg:grid-cols-4" /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved works" value={approvedCount} icon={CheckCircle2} helper="Ready or live on the public site" />
        <StatCard label="Under review" value={pendingCount} icon={Clock3} helper="In the approval queue" />
        <StatCard label="Changes requested" value={changesCount} icon={ListTodo} helper="Work with feedback" />
        <StatCard label="Meeting attendance" value={`${attendanceRate}%`} icon={TrendingUp} helper="Based on recorded meetings" />
      </div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.9fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-300">Your work</p><h2 className="mt-1 text-lg font-semibold text-white">Recent submissions</h2></div><Button variant="outline" size="sm" onClick={() => navigate('/dashboard/submit')}>New submission</Button></div>
          {loading ? <div className="space-y-3"><div className="glass-card h-24 animate-pulse" /><div className="glass-card h-24 animate-pulse" /></div> : mySubmissions.length ? <div className="space-y-3">{mySubmissions.slice(0, 4).map((submission, index) => <motion.div key={submission.id} {...(reduceMotion ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(index, 12) * .04, duration: .18 } })}><Card className="flex items-center justify-between gap-4 p-3.5 sm:p-4" hoverEffect><div className="flex min-w-0 items-center gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">{submission.thumbnail || submission.mediaUrl ? <img src={submission.thumbnail || submission.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-red-300"><UploadCloud size={18} /></div>}</div><div className="min-w-0"><p className="truncate text-[10px] text-red-300">{submission.domainName || 'Creative work'} <span className="px-1 text-gray-600">·</span><span className="text-gray-500">{submission.date}</span></p><h3 className="mt-1 truncate text-sm font-semibold text-white">{submission.title}</h3><p className="mt-0.5 truncate text-xs text-gray-400">{submission.description}</p></div></div><StatusPill status={submission.status} /></Card></motion.div>)}</div> : <EmptyState icon={UploadCloud} title="No submissions yet" description="Your creative work will appear here after you submit it." action={<Button size="sm" onClick={() => navigate('/dashboard/submit')}>Submit work</Button>} className="py-8" />}
        </section>

        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-300">Stay on track</p><h2 className="mt-1 text-lg font-semibold text-white">Your tasks</h2></div><Link to="/dashboard/tasks" className="text-xs font-medium text-red-300 hover:text-white">All tasks <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
            {loading ? <div className="space-y-3"><div className="glass-card h-20 animate-pulse" /><div className="glass-card h-20 animate-pulse" /></div> : myTasks.length ? <div className="space-y-3">{myTasks.slice(0, 4).map((task) => <button key={task._id} type="button" onClick={() => navigate(`/tasks/${task._id}`)} className="focus-red glass-card glass-card-clickable block w-full p-4 text-left"><span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-white">{task.title}</span><span className="rounded-full border border-red-500/25 bg-red-500/[.08] px-2 py-1 text-[10px] capitalize text-red-200">{String(task.myStatus || task.status).replaceAll('_', ' ')}</span></span><span className="mt-2 flex items-center gap-1.5 text-xs text-gray-400"><Clock3 size={13} />Due {dueDate(task.dueAt || task.deadline)}</span></button>)}</div> : <EmptyState icon={ListTodo} title="No active tasks" description="Assigned tasks will appear here." className="py-7" />}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-300">On your calendar</p><h2 className="mt-1 text-lg font-semibold text-white">Next meeting</h2></div><Link to="/dashboard/attendance" className="text-xs font-medium text-red-300 hover:text-white">All meetings <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
            {loading ? <div className="glass-card h-24 animate-pulse" /> : nextMeeting ? <Card className="dashboard-meeting-card p-4" hoverEffect={false}><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-500/[.08] text-red-300"><CalendarDays size={18} /></span><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-[.16em] text-red-300">Upcoming</p><h3 className="mt-1 truncate text-sm font-semibold text-white">{nextMeeting.title}</h3><p className="mt-1 text-xs text-gray-400">{new Date(nextMeeting.date).toLocaleString()}{nextMeeting.venue ? ` · ${nextMeeting.venue}` : ''}</p></div></div><Link to={`/meetings/${nextMeeting._id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-300 hover:text-white">View meeting <ArrowRight size={13} /></Link></Card> : <EmptyState icon={CalendarDays} title="No upcoming meetings" description="New meetings for your groups will appear here." className="py-7" />}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
