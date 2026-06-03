import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { IblaiRootState } from "@/store/iblai-store";

type TenantState = {
  requestedTenant: string;
};

const initialState: TenantState = {
  requestedTenant: "",
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    updateRequestedTenant: (state, action: PayloadAction<string>) => {
      state.requestedTenant = action.payload;
    },
  },
});

export const { updateRequestedTenant } = tenantSlice.actions;

export default tenantSlice;

export const selectRequestedTenant = (state: IblaiRootState) =>
  state.tenant.requestedTenant;
