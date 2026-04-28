// Source file for roomsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { roomAPI } from '../shared/api/api';

const CACHE_TTL = 60 * 1000; // 60 seconds

interface RoomState {
  items: any[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: RoomState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Internal actual fetch
export const fetchRoomsForce = createAsyncThunk('rooms/fetchForce', async () => {
  const response = await roomAPI.getAll();
  return Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
});

// Conditionally dispatched fetch using TTL Cache
export const fetchRooms = createAsyncThunk(
  'rooms/fetch',
  async (_, { dispatch, getState }) => {
    const state = getState() as { rooms: RoomState };
    const lastFetched = state.rooms.lastFetched;
    const now = Date.now();

    if (lastFetched && now - lastFetched < CACHE_TTL) {
      return state.rooms.items; // Return cached
    }
    const result = await dispatch(fetchRoomsForce()).unwrap();
    return result;
  }
);

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoomsForce.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoomsForce.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchRoomsForce.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rooms';
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  },
});

export default roomsSlice.reducer;
