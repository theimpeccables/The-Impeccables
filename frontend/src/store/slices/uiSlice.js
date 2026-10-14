import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isMobileNavOpen: false,
  activeModal: null, // modal identifier
  modalData: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileNav: (state) => {
      state.isMobileNavOpen = !state.isMobileNavOpen;
    },
    setMobileNavOpen: (state, action) => {
      state.isMobileNavOpen = action.payload;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data || null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
  },
});

export const {
  toggleMobileNav,
  setMobileNavOpen,
  openModal,
  closeModal,
} = uiSlice.actions;

export default uiSlice.reducer;
