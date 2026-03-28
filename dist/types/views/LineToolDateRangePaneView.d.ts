import { IChartApiBase, ISeriesApi, SeriesType } from 'lightweight-charts';
import { LineToolPaneView, CompositeRenderer, TextRenderer, SegmentRenderer } from 'lightweight-charts-line-tools-core';
import { LineToolDateRange } from '../model/LineToolDateRange';
/**
 * Pane View for the Date Range tool.
 *
 * TradingView-style implementation with:
 * 1. A Rectangle (the main body)
 * 2. A horizontal arrow showing direction of time
 * 3. A label showing bars count and calendar days (e.g., "15 bars, 21 days")
 */
export declare class LineToolDateRangePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {
    protected _arrowLineRenderer: SegmentRenderer<HorzScaleItem>;
    protected _dateDifferenceLabelRenderer: TextRenderer<HorzScaleItem>;
    constructor(source: LineToolDateRange<HorzScaleItem>, chart: IChartApiBase<any>, series: ISeriesApi<SeriesType, any>);
    protected _updateImpl(height: number, width: number): void;
    private _addDateDifferenceLabel;
    protected _addAnchors(renderer: CompositeRenderer<any>): void;
    private _getAnchorCursor;
}
