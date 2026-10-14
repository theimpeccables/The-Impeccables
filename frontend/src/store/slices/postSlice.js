import { createSlice } from '@reduxjs/toolkit';
import { GALLERY_POSTS, INITIAL_PENDING_SUBMISSIONS } from '../../constants';

const initialState = {
  publishedPosts: GALLERY_POSTS,
  submissions: INITIAL_PENDING_SUBMISSIONS,
  selectedPost: null,
  activeFilterType: 'all', // 'all', 'artwork', 'photography', 'video', 'article', 'graphic'
  activeFilterDomain: 'all',
  searchQuery: '',
};

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    addSubmission: (state, action) => {
      const newSub = {
        ...action.payload,
        id: `sub-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'under_review',
        reviewNotes: [],
      };
      state.submissions.unshift(newSub);
    },
    approveSubmission: (state, action) => {
      const { id, reviewerName, feedback } = action.payload;
      const sub = state.submissions.find((s) => s.id === id);
      if (sub) {
        sub.status = 'approved';
        sub.reviewNotes.push({
          reviewer: reviewerName,
          action: 'Approved',
          note: feedback || 'Meets artistic standards of The Impeccables.',
          timestamp: new Date().toISOString(),
        });
      }
    },
    publishSubmission: (state, action) => {
      const { id } = action.payload;
      const subIndex = state.submissions.findIndex((s) => s.id === id);
      if (subIndex !== -1) {
        const sub = state.submissions[subIndex];
        sub.status = 'published';
        // Add to public feed
        state.publishedPosts.unshift({
          ...sub,
          id: `post-${Date.now()}`,
          likes: 0,
        });
      }
    },
    rejectSubmission: (state, action) => {
      const { id, reviewerName, reason } = action.payload;
      const sub = state.submissions.find((s) => s.id === id);
      if (sub) {
        sub.status = 'rejected';
        sub.reviewNotes.push({
          reviewer: reviewerName,
          action: 'Rejected',
          note: reason || 'Does not match submission criteria.',
          timestamp: new Date().toISOString(),
        });
      }
    },
    requestChanges: (state, action) => {
      const { id, reviewerName, requestedChanges } = action.payload;
      const sub = state.submissions.find((s) => s.id === id);
      if (sub) {
        sub.status = 'changes_requested';
        sub.reviewNotes.push({
          reviewer: reviewerName,
          action: 'Changes Requested',
          note: requestedChanges,
          timestamp: new Date().toISOString(),
        });
      }
    },
    setFilterType: (state, action) => {
      state.activeFilterType = action.payload;
    },
    setFilterDomain: (state, action) => {
      state.activeFilterDomain = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    likePost: (state, action) => {
      const postId = action.payload;
      const post = state.publishedPosts.find((p) => p.id === postId);
      if (post) {
        post.likes += 1;
      }
    },
    setSelectedPost: (state, action) => {
      state.selectedPost = action.payload;
    },
  },
});

export const {
  addSubmission,
  approveSubmission,
  publishSubmission,
  rejectSubmission,
  requestChanges,
  setFilterType,
  setFilterDomain,
  setSearchQuery,
  likePost,
  setSelectedPost,
} = postSlice.actions;

export default postSlice.reducer;
