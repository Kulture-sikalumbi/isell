-- Windows/Mac download links per device (tool), not parent category

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS download_url_mac TEXT;

COMMENT ON COLUMN tools.download_url IS 'Windows tool download URL for this device';
COMMENT ON COLUMN tools.download_url_mac IS 'Mac tool download URL for this device';
