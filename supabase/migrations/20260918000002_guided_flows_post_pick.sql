-- Add optional post-pick message to guided_entry_flows.
-- When set, the chatbot shows this message (with follow-up suggestions) after
-- a user picks a template, instead of navigating immediately.

ALTER TABLE guided_entry_flows
  ADD COLUMN IF NOT EXISTS post_pick_message TEXT;
