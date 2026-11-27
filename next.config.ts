import type { NextConfig } from 'next';
import { ROUTER_SECONDS } from './lib/keep';

const config: NextConfig = {
  experimental: {
    // a board seen moments ago shows again at once on its tab; its share of the boards' lag budget (lib/keep.ts)
    staleTimes: { dynamic: ROUTER_SECONDS },
  },
};

export default config;
