// lightweight-charts-line-tools-date-range/src/views/LineToolDateRangePaneView.ts

import {
	IChartApiBase,
	ISeriesApi,
	SeriesType,
	Coordinate,
	LineStyle,
} from 'lightweight-charts';

import {
	BaseLineTool,
	LineToolPaneView,
	CompositeRenderer,
	AnchorPoint,
	OffScreenState,
	getToolCullingState,
	LineToolOptionsInternal,
	TextRenderer,
	RectangleRenderer,
	SegmentRenderer,
	deepCopy,
	LineEnd,
	BoxVerticalAlignment,
	BoxHorizontalAlignment,
	PaneCursorType,
	TextAlignment,
	LineOptions,
	TextRendererData,
	LineToolPoint,
	LineToolCullingInfo,
	ensureNotNull
} from 'lightweight-charts-line-tools-core';

import { LineToolDateRange } from '../model/LineToolDateRange';


/**
 * Pane View for the Date Range tool.
 *
 * TradingView-style implementation with:
 * 1. A Rectangle (the main body)
 * 2. A horizontal arrow showing direction of time
 * 3. A label showing bars count and calendar days (e.g., "15 bars, 21 days")
 */
export class LineToolDateRangePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {

	protected _arrowLineRenderer: SegmentRenderer<HorzScaleItem> = new SegmentRenderer();
	protected _dateDifferenceLabelRenderer: TextRenderer<HorzScaleItem> = new TextRenderer();

	public constructor(
		source: LineToolDateRange<HorzScaleItem>,
		chart: IChartApiBase<any>,
		series: ISeriesApi<SeriesType, any>,
	) {
		super(source as BaseLineTool<HorzScaleItem>, chart, series);
	}

	protected override _updateImpl(height: number, width: number): void {
		this._invalidated = false;
		this._renderer.clear();

		const tool = this._tool as LineToolDateRange<HorzScaleItem>;
		const options = tool.options() as LineToolOptionsInternal<'DateRange'>;

		if (!options.visible) {
			return;
		}

		const hasScreenPoints = this._updatePoints();
		if (!hasScreenPoints || this._points.length < tool.pointsCount) {
			return;
		}

		const compositeRenderer = this._renderer as CompositeRenderer<HorzScaleItem>;
		const P0 = this._points[0];
		const P1 = this._points[1];

		const minX = Math.min(P0.x, P1.x);
		const maxX = Math.max(P0.x, P1.x);
		const minY = Math.min(P0.y, P1.y);
		const maxY = Math.max(P0.y, P1.y);

		const topLeftScreen = new AnchorPoint(minX, minY, 0);
		const bottomRightScreen = new AnchorPoint(maxX, maxY, 1);

		// --- 1. Rectangle Body ---
		const rectBodyPoints: [AnchorPoint, AnchorPoint] = [topLeftScreen, bottomRightScreen];

		this._rectangleRenderer.setData({
			...deepCopy((options as any).dateRange.rectangle),
			points: rectBodyPoints,
			hitTestBackground: true,
			toolDefaultHoverCursor: options.defaultHoverCursor,
			toolDefaultDragCursor: options.defaultDragCursor,
		});

		compositeRenderer.append(this._rectangleRenderer);

		// --- 2. Horizontal Arrow ---
		const activePoints = tool.points();
		if (activePoints.length >= 2) {
			const time0Raw = activePoints[0];
			const time1Raw = activePoints[1];
			const isForward = time1Raw.timestamp >= time0Raw.timestamp;

			// Arrow in the center vertically
			const midY = (minY + maxY) / 2 as Coordinate;

			// Arrow goes from start time to end time (shows direction)
			const arrowStart = new AnchorPoint(isForward ? minX : maxX, midY, 0);
			const arrowEnd = new AnchorPoint(isForward ? maxX : minX, midY, 1);

			const arrowColor = (options as any).dateRange.rectangle.border?.color || '#2196F3';

			this._arrowLineRenderer.setData({
				points: [arrowStart, arrowEnd],
				line: {
					color: arrowColor,
					width: 2,
					style: LineStyle.Solid,
					extend: { left: false, right: false },
					join: 'miter',
					cap: 'butt',
					end: {
						left: LineEnd.Normal,
						right: LineEnd.Arrow,
					},
				} as LineOptions,
			});
			compositeRenderer.append(this._arrowLineRenderer);

			// --- 3. Bars + Days Label ---
			this._addDateDifferenceLabel(compositeRenderer, tool, P0, P1, isForward, minX, maxX, minY, maxY);
		}

		// --- 4. Anchors ---
		this._addAnchors(compositeRenderer);
	}

	private _addDateDifferenceLabel(
		renderer: CompositeRenderer<HorzScaleItem>,
		tool: LineToolDateRange<HorzScaleItem>,
		P0: AnchorPoint,
		P1: AnchorPoint,
		isForward: boolean,
		minX: number,
		maxX: number,
		minY: number,
		maxY: number,
	): void {
		const options = tool.options() as LineToolOptionsInternal<'DateRange'>;
		const dateRangeOptions = (options as any).dateRange;

		const allActivePoints = tool.points();
		if (allActivePoints.length < 2) return;

		const time0Raw = allActivePoints[0];
		const time1Raw = allActivePoints[1];

		const timestamp0 = time0Raw.timestamp as number;
		const timestamp1 = time1Raw.timestamp as number;

		const timeDiffSeconds = Math.abs(timestamp1 - timestamp0);
		const calendarDays = Math.round(timeDiffSeconds / 86400);

		const timeScale = this._chart.timeScale();
		let barCount = 0;

		try {
			const logicalRange = timeScale.getVisibleLogicalRange();
			if (logicalRange) {
				const coord0 = timeScale.timeToCoordinate(time0Raw.timestamp as any);
				const coord1 = timeScale.timeToCoordinate(time1Raw.timestamp as any);
				
				if (coord0 !== null && coord1 !== null) {
					const visibleRange = timeScale.getVisibleRange();
					if (visibleRange) {
						const startTime = visibleRange.from as number;
						const endTime = visibleRange.to as number;
						
						const chartWidth = Math.abs(
							(timeScale.timeToCoordinate(endTime as any) || 0) - 
							(timeScale.timeToCoordinate(startTime as any) || 0)
						);
						
						if (logicalRange && chartWidth > 0) {
							const barsInView = logicalRange.to - logicalRange.from;
							const pixelsPerBar = chartWidth / barsInView;
							
							if (pixelsPerBar > 0) {
								const pixelDiff = Math.abs(coord1 - coord0);
								barCount = Math.round(pixelDiff / pixelsPerBar);
							}
						}
					}
				}
			}
		} catch (e) {
			barCount = Math.round(calendarDays * 5 / 7);
		}

		if (barCount < 0) barCount = 0;

		const barsText = barCount === 1 ? '1 bar' : `${barCount} bars`;
		const daysText = calendarDays === 1 ? '1 day' : `${calendarDays} days`;
		const labelText = `${barsText}, ${daysText}`;

		const geometricCenterX = (minX + maxX) / 2 as Coordinate;
		const labelY = ((minY + maxY) / 2) as Coordinate;

		const labelPivot = new AnchorPoint(geometricCenterX, labelY, 0);

		const labelOptions = dateRangeOptions.label || {};
		const labelColor = labelOptions.color || '#ffffff';
		const labelFontSize = labelOptions.fontSize || 12;

		const finalLabelOptions = deepCopy(options.text);
		finalLabelOptions.value = labelText;

		finalLabelOptions.box.alignment.horizontal = BoxHorizontalAlignment.Center;
		finalLabelOptions.box.alignment.vertical = BoxVerticalAlignment.Bottom;
		finalLabelOptions.alignment = TextAlignment.Center;
		finalLabelOptions.font.size = labelFontSize;
		finalLabelOptions.font.bold = true;
		finalLabelOptions.font.color = labelColor;

		finalLabelOptions.box.offset = { x: 0, y: -15 };

		finalLabelOptions.box.background = {
			color: 'rgba(0, 0, 0, 0.7)',
			inflation: { x: 4, y: 2 }
		};

		const textRendererData: TextRendererData = {
			points: [labelPivot],
			text: finalLabelOptions,
			hitTestBackground: true,
		};

		this._dateDifferenceLabelRenderer.setData(textRendererData);
		renderer.append(this._dateDifferenceLabelRenderer);
	}

	protected override _addAnchors(renderer: CompositeRenderer<any>): void {
		if (this._points.length < 2) return;

		const P0 = this._points[0];
		const P1 = this._points[1];

		const anchor0 = new AnchorPoint(P0.x, P0.y, 0, false, this._getAnchorCursor(0));
		const anchor1 = new AnchorPoint(P1.x, P1.y, 1, false, this._getAnchorCursor(1));
		const anchor2 = new AnchorPoint(P0.x, P1.y, 2, false, this._getAnchorCursor(2));
		const anchor3 = new AnchorPoint(P1.x, P0.y, 3, false, this._getAnchorCursor(3));

		const midX = (P0.x + P1.x) / 2 as Coordinate;
		const midY = (P0.y + P1.y) / 2 as Coordinate;

		const anchor4 = new AnchorPoint(P0.x, midY, 4, true, PaneCursorType.HorizontalResize);
		const anchor5 = new AnchorPoint(P1.x, midY, 5, true, PaneCursorType.HorizontalResize);
		const anchor6 = new AnchorPoint(midX, P0.y, 6, true, PaneCursorType.VerticalResize);
		const anchor7 = new AnchorPoint(midX, P1.y, 7, true, PaneCursorType.VerticalResize);

		const anchorData = {
			points: [
				anchor0, anchor1, anchor2, anchor3,
				anchor4, anchor5, anchor6, anchor7
			],
		};

		const toolOptions = this._tool.options();
		renderer.append(this.createLineAnchor({
			...anchorData,
			defaultAnchorHoverCursor: toolOptions.defaultAnchorHoverCursor,
			defaultAnchorDragCursor: toolOptions.defaultAnchorDragCursor,
		}, 0));
	}

	private _getAnchorCursor(index: number): PaneCursorType {
		const P0 = this._points[0];
		const P1 = this._points[1];

		const isRight = P1.x >= P0.x;
		const isDown = P1.y >= P0.y;

		const nwSe = PaneCursorType.DiagonalNwSeResize;
		const neSw = PaneCursorType.DiagonalNeSwResize;

		switch (index) {
			case 0:
			case 1:
				return (isRight === isDown) ? nwSe : neSw;
			case 2:
			case 3:
				return (isRight === isDown) ? neSw : nwSe;
			case 4:
			case 5:
				return PaneCursorType.HorizontalResize;
			case 6:
			case 7:
				return PaneCursorType.VerticalResize;
			default:
				return PaneCursorType.Move;
		}
	}
}