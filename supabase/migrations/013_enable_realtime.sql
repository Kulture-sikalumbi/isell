-- Enable Supabase Realtime for live balance, alerts, and activations

ALTER PUBLICATION supabase_realtime ADD TABLE user_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE activations;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
