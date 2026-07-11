-- TRC20 USDT as a separate wallet deposit method (Binance Pay stays as `binance`)

ALTER TYPE deposit_method ADD VALUE IF NOT EXISTS 'usdt_trc20';

COMMENT ON TYPE deposit_method IS 'mtn/airtel mobile money, binance Binance Pay user ID, usdt_trc20 on-chain USDT';
