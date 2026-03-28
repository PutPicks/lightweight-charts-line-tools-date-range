import { ILineToolsPlugin } from 'lightweight-charts-line-tools-core';
import { LineToolDateRange } from './model/LineToolDateRange';
/**
 * Registers the Date Range tool with the provided Core Plugin instance.
 *
 * @param corePlugin - The instance of the Core Line Tools Plugin.
 * @returns void
 *
 * @example
 * ```ts
 * registerDateRangePlugin(corePlugin);
 * ```
 */
export declare function registerDateRangePlugin<HorzScaleItem>(corePlugin: ILineToolsPlugin & {
    registerLineTool: <H>(type: string, toolClass: new (...args: any[]) => any) => void;
}): void;
export { LineToolDateRange };
export default registerDateRangePlugin;
