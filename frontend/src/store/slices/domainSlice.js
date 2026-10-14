import { createSlice } from '@reduxjs/toolkit';
import { DOMAINS } from '../../data/mockData';

const initialState = {
  domains: DOMAINS,
  selectedDomain: null,
  filterDomain: 'all',
};

const domainSlice = createSlice({
  name: 'domain',
  initialState,
  reducers: {
    setSelectedDomain: (state, action) => {
      state.selectedDomain = state.domains.find(
        (d) => d.slug === action.payload || d.id === action.payload
      ) || null;
    },
    setFilterDomain: (state, action) => {
      state.filterDomain = action.payload;
    },
  },
});

export const { setSelectedDomain, setFilterDomain } = domainSlice.actions;
export default domainSlice.reducer;
