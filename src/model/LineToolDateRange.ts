// lightweight-charts-line-tools-date-range/src/model/LineToolDateRange.ts

import {
	IChartApiBase,
	ISeriesApi,
	IHorzScaleBehavior,
	SeriesType,
	LineStyle,
	Coordinate,
	Time,
} from 'lightweight-charts';

import {
	BaseLineTool,
	LineToolPoint,
	LineToolType,
	LineToolOptionsInternal,
	Point,
	LineToolOptionsMap,
	LineToolPartialOptionsMap,
	merge,
	DeepPartial,
	LineToolsCorePlugin,
	deepCopy,
	PriceAxisLabelStackingManager,
	LineEnd,
	TextAlignment,
	BoxVerticalAlignment,
	BoxHorizontalAlignment,
	TextOptions,
	LineOptions,
	RectangleOptions,
	PaneCursorType,
	InteractionPhase,
	ConstraintResult,
	HitTestResult,
	CompositeRenderer,
	interpolateLogicalIndexFromTime,
	interpolateTimeFromLogicalIndex,
} from 'lightweight-charts-line-tools-core';

import { LineToolDateRangePaneView } from '../views/LineToolDateRangePaneView';

/**
 * Defines the default configuration options for the Date Range tool.
 */
export const DateRangeOptionDefaults: LineToolOptionsInternal<'DateRange'> = {
	visible: true,
	editable: true,
	defaultHoverCursor: PaneCursorType.Pointer,
	defaultDragCursor: PaneCursorType.Grabbing,
	defaultAnchorHoverCursor: PaneCursorType.Pointer,
	defaultAnchorDragCursor: PaneCursorType.Grabbing,
	notEditableCursor: PaneCursorType.NotAllowed,
	showPriceAxisLabels: false,
	showTimeAxisLabels: true,
	priceAxisLabelAlwaysVisible: false,
	timeAxisLabelAlwaysVisible: false,

	text: {
		value: '',
		padding: 0,
		wordWrapWidth: 0,
		forceTextAlign: false,
		forceCalculateMaxLineWidth: false,
		alignment: TextAlignment.Center,

		font: {
			color: 'rgba(255, 255, 255, 1)',
			size: 12,
			bold: false,
			italic: false,
			family: 'sans-serif',
		},

		box: {
			alignment: { vertical: BoxVerticalAlignment.Middle, horizontal: BoxHorizontalAlignment.Center },
			angle: 0,
			scale: 1,
			padding: { x: 0, y: 0 },
			maxHeight: 0,
			shadow: { blur: 0, color: 'transparent', offset: { x: 0, y: 0 } },
			border: { color: 'transparent', width: 0, radius: 0, highlight: false, style: LineStyle.Solid },
			background: { color: 'transparent', inflation: { x: 0, y: 0 } },
		},
	} as TextOptions,

	dateRange: {
		rectangle: {
			extend: { left: false, right: false },
			background: { color: 'rgba(33, 150, 243, 0.1)' },
			border: { width: 1, style: LineStyle.Solid, color: '#2196F3', radius: 0 },
		},

		verticalLine: {
			width: 1,
			color: '#2196F3',
			style: LineStyle.Solid,
			join: 'miter',
			cap: 'butt',
			end: { left: LineEnd.Normal, right: LineEnd.Normal },
			extend: { left: false, right: false },
		} as LineOptions,

		horizontalLine: {
			width: 1,
			color: '#2196F3',
			style: LineStyle.Dashed,
			join: 'miter',
			cap: 'butt',
			end: { left: LineEnd.Normal, right: LineEnd.Normal },
			extend: { left: false, right: false },
		} as LineOptions,

		showLeftDate: true,
		showRightDate: true,

		label: {
			color: '#ffffff',
			fontSize: 12,
		},
	} as any
};


/**
 * Concrete implementation of the Date Range drawing tool.
 *
 * It is defined by 2 points (P0, P1) forming a horizontal range.
 * This tool calculates and displays the horizontal time difference
 * (bars count and calendar days) between the two points.
 */
export class LineToolDateRange<HorzScaleItem> extends BaseLineTool<HorzScaleItem> {
	public override readonly toolType: LineToolType = 'DateRange';
	public override readonly pointsCount: number = 2;

	public override maxAnchorIndex(): number {
		return 7;
	}

	public constructor(
		coreApi: LineToolsCorePlugin<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
		options: DeepPartial<LineToolOptionsInternal<'DateRange'>> = {},
		points: LineToolPoint[] = [],
		priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>
	) {
		const finalOptions = deepCopy(DateRangeOptionDefaults) as LineToolOptionsInternal<'DateRange'>;
		merge(finalOptions, options as LineToolPartialOptionsMap['DateRange']);

		super(
			coreApi,
			chart,
			series,
			horzScaleBehavior,
			finalOptions,
			points,
			'DateRange',
			2,
			priceAxisLabelStackingManager
		);

		this._setPaneViews([new LineToolDateRangePaneView(this, this._chart, this._series)]);
	}

	public supportsClickClickCreation(): boolean {
		return true;
	}

	public supportsClickDragCreation(): boolean {
		return true;
	}

	public supportsShiftClickClickConstraint(): boolean {
		return true;
	}

	public supportsShiftClickDragConstraint(): boolean {
		return true;
	}

	public override setPoint(index: number, point: LineToolPoint): void {
		if (index < 2) {
			super.setPoint(index, point);
			return;
		}

		const P0 = this._points[0];
		const P1 = this._points[1];

		switch (index) {
			case 2:
				P0.timestamp = point.timestamp;
				P1.price = point.price;
				break;
			case 3:
				P0.price = point.price;
				P1.timestamp = point.timestamp;
				break;
			case 4:
				P0.timestamp = point.timestamp;
				break;
			case 5:
				P1.timestamp = point.timestamp;
				break;
			case 6:
				P0.price = point.price;
				break;
			case 7:
				P1.price = point.price;
				break;
		}

		this._triggerChartUpdate();
	}

	public override getPoint(index: number): LineToolPoint | null {
		if (this._points.length < 2) {
			return super.getPoint(index);
		}

		const P0 = this._points[0];
		const P1 = this._points[1];

		const midPrice = (P0.price + P1.price) / 2;
		const midTime = (P0.timestamp + P1.timestamp) / 2;

		switch (index) {
			case 0: return P0;
			case 1: return P1;
			case 2: return { price: P1.price, timestamp: P0.timestamp };
			case 3: return { price: P0.price, timestamp: P1.timestamp };
			case 4: return { price: midPrice, timestamp: P0.timestamp };
			case 5: return { price: midPrice, timestamp: P1.timestamp };
			case 6: return { price: P0.price, timestamp: midTime };
			case 7: return { price: P1.price, timestamp: midTime };
			default: return null;
		}
	}

	public normalize(): void {
		// Intentionally empty - preserve point order for direction
	}

	public override getShiftConstrainedPoint(
		pointIndex: number,
		rawScreenPoint: Point,
		phase: InteractionPhase,
		originalLogicalPoint: LineToolPoint,
		allOriginalLogicalPoints: LineToolPoint[]
	): ConstraintResult {
		const originalScreenPoint = this.pointToScreenPoint(originalLogicalPoint);

		if (!originalScreenPoint) {
			return { point: rawScreenPoint, snapAxis: 'none' };
		}

		if (phase === InteractionPhase.Creation) {
			const P0_logical = allOriginalLogicalPoints[0];
			const P0_screen = this.pointToScreenPoint(P0_logical)!;

			return {
				point: new Point(rawScreenPoint.x, P0_screen.y),
				snapAxis: 'price',
			};
		}

		if (pointIndex === 4 || pointIndex === 5) {
			return {
				point: new Point(rawScreenPoint.x, originalScreenPoint.y),
				snapAxis: 'price',
			};
		}
		if (pointIndex === 6 || pointIndex === 7) {
			return {
				point: new Point(originalScreenPoint.x, rawScreenPoint.y),
				snapAxis: 'time',
			};
		}

		let opposingIndex = -1;
		if (pointIndex === 0) opposingIndex = 1;
		else if (pointIndex === 1) opposingIndex = 0;
		else if (pointIndex === 2) opposingIndex = 3;
		else if (pointIndex === 3) opposingIndex = 2;

		const opposingLogical = allOriginalLogicalPoints[opposingIndex];
		const opposingScreen = this.pointToScreenPoint(opposingLogical);

		if (opposingScreen) {
			const dx = Math.abs(rawScreenPoint.x - opposingScreen.x);
			const dy = Math.abs(rawScreenPoint.y - opposingScreen.y);

			if (dx > dy) {
				return {
					point: new Point(rawScreenPoint.x, originalScreenPoint.y),
					snapAxis: 'price',
				};
			} else {
				return {
					point: new Point(originalScreenPoint.x, rawScreenPoint.y),
					snapAxis: 'time',
				};
			}
		}

		return {
			point: new Point(rawScreenPoint.x, originalScreenPoint.y),
			snapAxis: 'price',
		};
	}

	public override _internalHitTest(x: Coordinate, y: Coordinate): HitTestResult<any> | null {
		if (!this._paneViews || this._paneViews.length === 0) {
			return null;
		}

		const paneView = this._paneViews[0] as LineToolDateRangePaneView<HorzScaleItem>;
		const compositeRenderer = paneView.renderer() as CompositeRenderer<HorzScaleItem>;

		if (!compositeRenderer || !compositeRenderer.hitTest) {
			return null;
		}

		return compositeRenderer.hitTest(x, y);
	}
}