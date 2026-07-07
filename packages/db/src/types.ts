import type {
  applicationEvents,
  applications,
  companies,
  gmailSyncState,
  jobPostings,
  processedMessages,
} from './schema';

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type JobPosting = typeof jobPostings.$inferSelect;
export type NewJobPosting = typeof jobPostings.$inferInsert;

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type NewApplicationEvent = typeof applicationEvents.$inferInsert;

export type GmailSyncState = typeof gmailSyncState.$inferSelect;
export type NewGmailSyncState = typeof gmailSyncState.$inferInsert;

export type ProcessedMessage = typeof processedMessages.$inferSelect;
export type NewProcessedMessage = typeof processedMessages.$inferInsert;
