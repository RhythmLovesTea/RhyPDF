/**
 * PDF Engine Dedicated Web Worker Entrypoint
 */

import * as Comlink from 'comlink';
import { EngineService } from './engine-service';

const service = new EngineService();
Comlink.expose(service);
