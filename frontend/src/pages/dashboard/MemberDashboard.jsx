import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/Badge';
import api, { apiErrorMessage } from '../../services/api';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const MemberDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [loadError, setLoadError] = useState('');
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
    });
    return () => { active = false; };
  }, [user?.id, user?._id]);

  const approvedCount = mySubmissions.filter((s) => s.status === 'approved' || s.status === 'published').length;
  const pendingCount = mySubmissions.filter((s) => s.status === 'under_review').length;
  const changesCount = mySubmissions.filter((s) => s.status === 'changes_requested').length;

  return (
    <div className="space-y-8 text-gray-100">
      {showJoinGroup && <Card className="flex flex-wrap items-center justify-between gap-4 border-red-500/25 bg-red-950/15 px-5 py-4"><div><p className="font-medium text-white">Join your domain group to get meeting updates</p><p className="mt-1 text-sm text-gray-400">Browse groups and request to join one.</p></div><Button onClick={() => navigate('/dashboard/groups')}>Browse groups</Button></Card>}
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/60 via-[#10101c] to-indigo-950/40 border border-purple-500/25 p-8 overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Active Club Member Session</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Welcome back, {user?.name || 'Impeccable Artist'}
            </h1>
            <p className="mt-2 text-sm text-gray-300">
              Assigned Domain:{' '}
              <span className="font-semibold text-purple-300">{user?.domain || 'Creative Arts'}</span>{' '}
              • KIET Society Session 2026-27
            </p>
          </div>

          <Button
            variant="glow"
            size="md"
            icon={UploadCloud}
            onClick={() => navigate('/dashboard/submit')}
          >
            Submit Creative Work
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Approved Posts */}
        <Card className="flex flex-col justify-between" hoverEffect={false}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-mono uppercase">Approved Works</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{approvedCount}</div>
          <div className="text-xs text-emerald-400 font-mono mt-1">Ready or live on public site</div>
        </Card>

        {/* In Review */}
        <Card className="flex flex-col justify-between" hoverEffect={false}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-mono uppercase">Under Review</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{pendingCount}</div>
          <div className="text-xs text-amber-400 font-mono mt-1">In domain approval queue</div>
        </Card>

        {/* Changes Requested */}
        <Card className="flex flex-col justify-between" hoverEffect={false}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-mono uppercase">Changes Requested</span>
            <AlertCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{changesCount}</div>
          <div className="text-xs text-purple-400 font-mono mt-1">Feedback from lead</div>
        </Card>

        {/* Attendance Rate */}
        <Card className="flex flex-col justify-between" hoverEffect={false}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-mono uppercase">Meeting Attendance</span>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-cyan-300">{attendanceRate}%</div>
          <div className="text-xs text-gray-400 font-mono mt-1">Based on your recorded meetings</div>
        </Card>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Submissions Pipeline (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">My Creative Submissions</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/submit')}
            >
              + New Submission
            </Button>
          </div>

          {loadError && <p className="mb-3 text-xs text-red-300" role="alert">{loadError}</p>}
          <div className="space-y-4">
            {mySubmissions.map((sub) => (
              <Card
                key={sub.id}
                className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                hoverEffect={true}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
                    <img
                      src={sub.thumbnail || sub.mediaUrl}
                      alt={sub.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-purple-400">{sub.domainName}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs font-mono text-gray-400">{sub.date}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{sub.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{sub.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <StatusPill status={sub.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Assigned Tasks & Duties (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-xl font-bold text-white">Event Duties & Tasks</h2>

          <Card className="p-6 space-y-4 bg-[#0d0d16]">
            {myTasks.map((task) => (
              <div
                key={task._id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-purple-400">{task.priority}</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white">{task.title}</div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                  <span className="text-gray-400">Status: {task.status}</span>
                  <button
                    onClick={() => navigate('/dashboard/tasks')}
                    className="text-purple-300 hover:text-white underline cursor-pointer"
                  >
                    View task
                  </button>
                </div>
              </div>
            ))}
          </Card>

          {/* Upcoming Society Meeting Notice */}
          {nextMeeting && <Card className="p-6 bg-purple-950/20 border-purple-500/30">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 mb-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Next Society Meetup</span>
            </div>
            <h4 className="text-sm font-bold text-white">{nextMeeting.title}</h4>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              {new Date(nextMeeting.date).toLocaleString()} {nextMeeting.venue ? `• ${nextMeeting.venue}` : ''}
            </p>
          </Card>}
        </div>

      </div>

    </div>
  );
};

export default MemberDashboard;
