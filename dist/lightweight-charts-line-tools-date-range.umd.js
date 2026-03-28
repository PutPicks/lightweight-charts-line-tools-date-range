(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lightweight-charts'), require('lightweight-charts-line-tools-core')) :
    typeof define === 'function' && define.amd ? define(['exports', 'lightweight-charts', 'lightweight-charts-line-tools-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LightweightChartsLineToolsPriceRange = {}, global.LightweightCharts, global.LightweightChartsLineToolsCore));
})(this, (function (exports, lightweightCharts, lightweightChartsLineToolsCore) { 'use strict';

    // lightweight-charts-line-tools-date-range/src/views/LineToolDateRangePaneView.ts
    /**
     * Pane View for the Date Range tool.
     *
     * TradingView-style implementation with:
     * 1. A Rectangle (the main body)
     * 2. A horizontal arrow showing direction of time
     * 3. A label showing bars count and calendar days (e.g., "15 bars, 21 days")
     */
    class LineToolDateRangePaneView extends lightweightChartsLineToolsCore.LineToolPaneView {
        constructor(source, chart, series) {
            super(source, chart, series);
            this._arrowLineRenderer = new lightweightChartsLineToolsCore.SegmentRenderer();
            this._dateDifferenceLabelRenderer = new lightweightChartsLineToolsCore.TextRenderer();
        }
        _updateImpl(height, width) {
            this._invalidated = false;
            this._renderer.clear();
            const tool = this._tool;
            const options = tool.options();
            if (!options.visible) {
                return;
            }
            const hasScreenPoints = this._updatePoints();
            if (!hasScreenPoints || this._points.length < tool.pointsCount) {
                return;
            }
            const compositeRenderer = this._renderer;
            const P0 = this._points[0];
            const P1 = this._points[1];
            const minX = Math.min(P0.x, P1.x);
            const maxX = Math.max(P0.x, P1.x);
            const minY = Math.min(P0.y, P1.y);
            const maxY = Math.max(P0.y, P1.y);
            const topLeftScreen = new lightweightChartsLineToolsCore.AnchorPoint(minX, minY, 0);
            const bottomRightScreen = new lightweightChartsLineToolsCore.AnchorPoint(maxX, maxY, 1);
            // --- 1. Rectangle Body ---
            const rectBodyPoints = [topLeftScreen, bottomRightScreen];
            this._rectangleRenderer.setData({
                ...lightweightChartsLineToolsCore.deepCopy(options.dateRange.rectangle),
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
                const midY = (minY + maxY) / 2;
                // Arrow goes from start time to end time (shows direction)
                const arrowStart = new lightweightChartsLineToolsCore.AnchorPoint(isForward ? minX : maxX, midY, 0);
                const arrowEnd = new lightweightChartsLineToolsCore.AnchorPoint(isForward ? maxX : minX, midY, 1);
                const arrowColor = options.dateRange.rectangle.border?.color || '#2196F3';
                this._arrowLineRenderer.setData({
                    points: [arrowStart, arrowEnd],
                    line: {
                        color: arrowColor,
                        width: 2,
                        style: lightweightCharts.LineStyle.Solid,
                        extend: { left: false, right: false },
                        join: 'miter',
                        cap: 'butt',
                        end: {
                            left: lightweightChartsLineToolsCore.LineEnd.Normal,
                            right: lightweightChartsLineToolsCore.LineEnd.Arrow,
                        },
                    },
                });
                compositeRenderer.append(this._arrowLineRenderer);
                // --- 3. Bars + Days Label ---
                this._addDateDifferenceLabel(compositeRenderer, tool, P0, P1, isForward, minX, maxX, minY, maxY);
            }
            // --- 4. Anchors ---
            this._addAnchors(compositeRenderer);
        }
        _addDateDifferenceLabel(renderer, tool, P0, P1, isForward, minX, maxX, minY, maxY) {
            const options = tool.options();
            const dateRangeOptions = options.dateRange;
            const allActivePoints = tool.points();
            if (allActivePoints.length < 2)
                return;
            const time0Raw = allActivePoints[0];
            const time1Raw = allActivePoints[1];
            // Calculate bars (using logical index difference)
            const timeScale = this._chart.timeScale();
            timeScale.timeToCoordinate(time0Raw.timestamp);
            timeScale.timeToCoordinate(time1Raw.timestamp);
            // Get the actual bar count by checking the data
            this._tool.getSeries();
            let barCount = 0;
            // Calculate approximate bars from timestamp difference and typical bar spacing
            const timestamp0 = time0Raw.timestamp;
            const timestamp1 = time1Raw.timestamp;
            const timeDiffSeconds = Math.abs(timestamp1 - timestamp0);
            // For daily data, one bar = 86400 seconds (24 hours)
            // But markets are only open ~5 days a week, so we use calendar days
            const calendarDays = Math.round(timeDiffSeconds / 86400);
            // Estimate trading bars (roughly 5/7 of calendar days for stocks)
            barCount = Math.round(calendarDays * 5 / 7);
            if (barCount < 1 && calendarDays > 0)
                barCount = 1;
            // Format the label: "X bars, Y days"
            const barsText = barCount === 1 ? '1 bar' : `${barCount} bars`;
            const daysText = calendarDays === 1 ? '1 day' : `${calendarDays} days`;
            const labelText = `${barsText}, ${daysText}`;
            // Position: center of the box, at the arrow end
            const geometricCenterX = (minX + maxX) / 2;
            const labelY = ((minY + maxY) / 2);
            const labelPivot = new lightweightChartsLineToolsCore.AnchorPoint(geometricCenterX, labelY, 0);
            const labelOptions = dateRangeOptions.label || {};
            const labelColor = labelOptions.color || '#ffffff';
            const labelFontSize = labelOptions.fontSize || 12;
            const finalLabelOptions = lightweightChartsLineToolsCore.deepCopy(options.text);
            finalLabelOptions.value = labelText;
            finalLabelOptions.box.alignment.horizontal = lightweightChartsLineToolsCore.BoxHorizontalAlignment.Center;
            finalLabelOptions.box.alignment.vertical = lightweightChartsLineToolsCore.BoxVerticalAlignment.Bottom;
            finalLabelOptions.alignment = lightweightChartsLineToolsCore.TextAlignment.Center;
            finalLabelOptions.font.size = labelFontSize;
            finalLabelOptions.font.bold = true;
            finalLabelOptions.font.color = labelColor;
            // Offset to push label above the arrow
            finalLabelOptions.box.offset = { x: 0, y: -15 };
            finalLabelOptions.box.background = {
                color: 'rgba(0, 0, 0, 0.7)',
                inflation: { x: 4, y: 2 }
            };
            const textRendererData = {
                points: [labelPivot],
                text: finalLabelOptions,
                hitTestBackground: true,
            };
            this._dateDifferenceLabelRenderer.setData(textRendererData);
            renderer.append(this._dateDifferenceLabelRenderer);
        }
        _addAnchors(renderer) {
            if (this._points.length < 2)
                return;
            const P0 = this._points[0];
            const P1 = this._points[1];
            const anchor0 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, P0.y, 0, false, this._getAnchorCursor(0));
            const anchor1 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, P1.y, 1, false, this._getAnchorCursor(1));
            const anchor2 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, P1.y, 2, false, this._getAnchorCursor(2));
            const anchor3 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, P0.y, 3, false, this._getAnchorCursor(3));
            const midX = (P0.x + P1.x) / 2;
            const midY = (P0.y + P1.y) / 2;
            const anchor4 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, midY, 4, true, lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize);
            const anchor5 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, midY, 5, true, lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize);
            const anchor6 = new lightweightChartsLineToolsCore.AnchorPoint(midX, P0.y, 6, true, lightweightChartsLineToolsCore.PaneCursorType.VerticalResize);
            const anchor7 = new lightweightChartsLineToolsCore.AnchorPoint(midX, P1.y, 7, true, lightweightChartsLineToolsCore.PaneCursorType.VerticalResize);
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
        _getAnchorCursor(index) {
            const P0 = this._points[0];
            const P1 = this._points[1];
            const isRight = P1.x >= P0.x;
            const isDown = P1.y >= P0.y;
            const nwSe = lightweightChartsLineToolsCore.PaneCursorType.DiagonalNwSeResize;
            const neSw = lightweightChartsLineToolsCore.PaneCursorType.DiagonalNeSwResize;
            switch (index) {
                case 0:
                case 1:
                    return (isRight === isDown) ? nwSe : neSw;
                case 2:
                case 3:
                    return (isRight === isDown) ? neSw : nwSe;
                case 4:
                case 5:
                    return lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize;
                case 6:
                case 7:
                    return lightweightChartsLineToolsCore.PaneCursorType.VerticalResize;
                default:
                    return lightweightChartsLineToolsCore.PaneCursorType.Move;
            }
        }
    }

    // lightweight-charts-line-tools-date-range/src/model/LineToolDateRange.ts
    /**
     * Defines the default configuration options for the Date Range tool.
     */
    const DateRangeOptionDefaults = {
        visible: true,
        editable: true,
        defaultHoverCursor: lightweightChartsLineToolsCore.PaneCursorType.Pointer,
        defaultDragCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
        defaultAnchorHoverCursor: lightweightChartsLineToolsCore.PaneCursorType.Pointer,
        defaultAnchorDragCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
        notEditableCursor: lightweightChartsLineToolsCore.PaneCursorType.NotAllowed,
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
            alignment: lightweightChartsLineToolsCore.TextAlignment.Center,
            font: {
                color: 'rgba(255, 255, 255, 1)',
                size: 12,
                bold: false,
                italic: false,
                family: 'sans-serif',
            },
            box: {
                alignment: { vertical: lightweightChartsLineToolsCore.BoxVerticalAlignment.Middle, horizontal: lightweightChartsLineToolsCore.BoxHorizontalAlignment.Center },
                angle: 0,
                scale: 1,
                padding: { x: 0, y: 0 },
                maxHeight: 0,
                shadow: { blur: 0, color: 'transparent', offset: { x: 0, y: 0 } },
                border: { color: 'transparent', width: 0, radius: 0, highlight: false, style: lightweightCharts.LineStyle.Solid },
                background: { color: 'transparent', inflation: { x: 0, y: 0 } },
            },
        },
        dateRange: {
            rectangle: {
                extend: { left: false, right: false },
                background: { color: 'rgba(33, 150, 243, 0.1)' },
                border: { width: 1, style: lightweightCharts.LineStyle.Solid, color: '#2196F3', radius: 0 },
            },
            verticalLine: {
                width: 1,
                color: '#2196F3',
                style: lightweightCharts.LineStyle.Solid,
                join: 'miter',
                cap: 'butt',
                end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                extend: { left: false, right: false },
            },
            horizontalLine: {
                width: 1,
                color: '#2196F3',
                style: lightweightCharts.LineStyle.Dashed,
                join: 'miter',
                cap: 'butt',
                end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                extend: { left: false, right: false },
            },
            showLeftDate: true,
            showRightDate: true,
            label: {
                color: '#ffffff',
                fontSize: 12,
            },
        }
    };
    /**
     * Concrete implementation of the Date Range drawing tool.
     *
     * It is defined by 2 points (P0, P1) forming a horizontal range.
     * This tool calculates and displays the horizontal time difference
     * (bars count and calendar days) between the two points.
     */
    class LineToolDateRange extends lightweightChartsLineToolsCore.BaseLineTool {
        maxAnchorIndex() {
            return 7;
        }
        constructor(coreApi, chart, series, horzScaleBehavior, options = {}, points = [], priceAxisLabelStackingManager) {
            const finalOptions = lightweightChartsLineToolsCore.deepCopy(DateRangeOptionDefaults);
            lightweightChartsLineToolsCore.merge(finalOptions, options);
            super(coreApi, chart, series, horzScaleBehavior, finalOptions, points, 'DateRange', 2, priceAxisLabelStackingManager);
            this.toolType = 'DateRange';
            this.pointsCount = 2;
            this._setPaneViews([new LineToolDateRangePaneView(this, this._chart, this._series)]);
        }
        supportsClickClickCreation() {
            return true;
        }
        supportsClickDragCreation() {
            return true;
        }
        supportsShiftClickClickConstraint() {
            return true;
        }
        supportsShiftClickDragConstraint() {
            return true;
        }
        setPoint(index, point) {
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
        getPoint(index) {
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
        normalize() {
            // Intentionally empty - preserve point order for direction
        }
        getShiftConstrainedPoint(pointIndex, rawScreenPoint, phase, originalLogicalPoint, allOriginalLogicalPoints) {
            const originalScreenPoint = this.pointToScreenPoint(originalLogicalPoint);
            if (!originalScreenPoint) {
                return { point: rawScreenPoint, snapAxis: 'none' };
            }
            if (phase === lightweightChartsLineToolsCore.InteractionPhase.Creation) {
                const P0_logical = allOriginalLogicalPoints[0];
                const P0_screen = this.pointToScreenPoint(P0_logical);
                return {
                    point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, P0_screen.y),
                    snapAxis: 'price',
                };
            }
            if (pointIndex === 4 || pointIndex === 5) {
                return {
                    point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                    snapAxis: 'price',
                };
            }
            if (pointIndex === 6 || pointIndex === 7) {
                return {
                    point: new lightweightChartsLineToolsCore.Point(originalScreenPoint.x, rawScreenPoint.y),
                    snapAxis: 'time',
                };
            }
            let opposingIndex = -1;
            if (pointIndex === 0)
                opposingIndex = 1;
            else if (pointIndex === 1)
                opposingIndex = 0;
            else if (pointIndex === 2)
                opposingIndex = 3;
            else if (pointIndex === 3)
                opposingIndex = 2;
            const opposingLogical = allOriginalLogicalPoints[opposingIndex];
            const opposingScreen = this.pointToScreenPoint(opposingLogical);
            if (opposingScreen) {
                const dx = Math.abs(rawScreenPoint.x - opposingScreen.x);
                const dy = Math.abs(rawScreenPoint.y - opposingScreen.y);
                if (dx > dy) {
                    return {
                        point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                        snapAxis: 'price',
                    };
                }
                else {
                    return {
                        point: new lightweightChartsLineToolsCore.Point(originalScreenPoint.x, rawScreenPoint.y),
                        snapAxis: 'time',
                    };
                }
            }
            return {
                point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                snapAxis: 'price',
            };
        }
        _internalHitTest(x, y) {
            if (!this._paneViews || this._paneViews.length === 0) {
                return null;
            }
            const paneView = this._paneViews[0];
            const compositeRenderer = paneView.renderer();
            if (!compositeRenderer || !compositeRenderer.hitTest) {
                return null;
            }
            return compositeRenderer.hitTest(x, y);
        }
    }

    // lightweight-charts-line-tools-date-range/src/index.ts
    const DATE_RANGE_LINE_NAME = 'DateRange';
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
    function registerDateRangePlugin(corePlugin) {
        corePlugin.registerLineTool(DATE_RANGE_LINE_NAME, LineToolDateRange);
        console.log(`Registered Line Tool: ${DATE_RANGE_LINE_NAME}`);
    }

    exports.LineToolDateRange = LineToolDateRange;
    exports.default = registerDateRangePlugin;
    exports.registerDateRangePlugin = registerDateRangePlugin;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=lightweight-charts-line-tools-date-range.umd.js.map
