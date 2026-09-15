import { SetMetadata } from '@nestjs/common';

export const MANAGE_APPLICATION_KEY = 'manageApplication';
export const ManageApplication = () =>
  SetMetadata(MANAGE_APPLICATION_KEY, true);
