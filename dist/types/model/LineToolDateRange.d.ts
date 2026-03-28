import { IChartApiBase, ISeriesApi, IHorzScaleBehavior, SeriesType, Coordinate } from 'lightweight-charts';
import { BaseLineTool, LineToolPoint, LineToolType, LineToolOptionsInternal, Point, DeepPartial, LineToolsCorePlugin, PriceAxisLabelStackingManager, InteractionPhase, ConstraintResult, HitTestResult } from 'lightweight-charts-line-tools-core';
/**
 * Defines the default configuration options for the Date Range tool.
 */
export declare const DateRangeOptionDefaults: LineToolOptionsInternal<'DateRange'>;
/**
 * Concrete implementation of the Date Range drawing tool.
 *
 * It is defined by 2 points (P0, P1) forming a horizontal range.
 * This tool calculates and displays the horizontal time difference
 * (bars count and calendar days) between the two points.
 */
export declare class LineToolDateRange<HorzScaleItem> extends BaseLineTool<HorzScaleItem> {
    readonly toolType: LineToolType;
    readonly pointsCount: number;
    maxAnchorIndex(): number;
    constructor(coreApi: LineToolsCorePlugin<HorzScaleItem>, chart: IChartApiBase<HorzScaleItem>, series: ISeriesApi<SeriesType, HorzScaleItem>, horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>, options: DeepPartial<LineToolOptionsInternal<"DateRange">> | undefined, points: LineToolPoint[] | undefined, priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>);
    supportsClickClickCreation(): boolean;
    supportsClickDragCreation(): boolean;
    supportsShiftClickClickConstraint(): boolean;
    supportsShiftClickDragConstraint(): boolean;
    setPoint(index: number, point: LineToolPoint): void;
    getPoint(index: number): LineToolPoint | null;
    normalize(): void;
    getShiftConstrainedPoint(pointIndex: number, rawScreenPoint: Point, phase: InteractionPhase, originalLogicalPoint: LineToolPoint, allOriginalLogicalPoints: LineToolPoint[]): ConstraintResult;
    _internalHitTest(x: Coordinate, y: Coordinate): HitTestResult<any> | null;
}
