'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import type { EditorTextStyle } from '@/types';

let fabricModule: typeof import('fabric') | null = null;
async function getFabric() {
    if (!fabricModule) fabricModule = await import('fabric');
    return fabricModule;
}

export interface ThumbnailEditorHandle {
    exportJPG(): Promise<Blob | null>;
}

interface Props {
    photoUrl: string | null;
    category: string;
    locationName: string;
    dateText: string;
    timeText: string;
    groupNum: string;
    members: string;
    textStyle: EditorTextStyle;
}

// ── 고정 템플릿 크기 ──
const TEMPLATE_WIDTH = 1080;
const TEMPLATE_HEIGHT = 1350;

const ThumbnailEditor = forwardRef<ThumbnailEditorHandle, Props>(
    ({ photoUrl, category, locationName, dateText, timeText, groupNum, members, textStyle }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasEl = useRef<HTMLCanvasElement>(null);
        const fabricRef = useRef<import('fabric').Canvas | null>(null);
        const bgImageRef = useRef<import('fabric').FabricImage | null>(null);

        // 오버레이 레이어 refs
        const gradientRef = useRef<import('fabric').Rect | null>(null);
        const categoryBadgeBorderRef = useRef<import('fabric').Rect | null>(null);
        const categoryTextRef = useRef<import('fabric').IText | null>(null);
        const verticalBarRef = useRef<import('fabric').Rect | null>(null);
        const titleRef = useRef<import('fabric').IText | null>(null);
        const dateTextRef = useRef<import('fabric').IText | null>(null);
        const timeTextRef = useRef<import('fabric').IText | null>(null);
        const groupTextRef = useRef<import('fabric').IText | null>(null);
        const membersTextRef = useRef<import('fabric').IText | null>(null);
        const logoImageRef = useRef<import('fabric').FabricImage | null>(null);
        const dividerRef = useRef<import('fabric').Line | null>(null);

        const dimOverlayRef = useRef<import('fabric').Path | null>(null);
        const borderRectRef = useRef<import('fabric').Rect | null>(null);

        // 가이드라인 (스냅핑)
        const vLineRef = useRef<import('fabric').Line | null>(null);
        const hLineRef = useRef<import('fabric').Line | null>(null);

        // Resize Observer state
        const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

        useEffect(() => {
            if (!containerRef.current) return;
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    if (width > 0 && height > 0) {
                        setContainerSize({ width, height });
                    }
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }, []);

        const getDisplaySize = useCallback(() => {
            if (containerSize.width === 0 || containerSize.height === 0) return { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0 };

            const padding = 0;
            const availableW = containerSize.width;
            const availableH = containerSize.height;

            let displayW = availableW;
            let displayH = displayW * (TEMPLATE_HEIGHT / TEMPLATE_WIDTH);

            if (displayH > availableH) {
                displayH = availableH;
                displayW = displayH * (TEMPLATE_WIDTH / TEMPLATE_HEIGHT);
            }

            const scale = displayW / TEMPLATE_WIDTH;
            const offsetX = (containerSize.width - displayW) / 2;
            const offsetY = (containerSize.height - displayH) / 2;

            return {
                width: containerSize.width,
                height: containerSize.height,
                scale,
                offsetX,
                offsetY
            };
        }, [containerSize]);

        // ── 텍스트/오버레이 레이어 업데이트 로직 ──
        const updateTextLayers = useCallback(async (canvas: import('fabric').Canvas, _scale: number) => {
            const { IText, Rect, FabricImage, Line } = await getFabric();
            const fabricMod = fabricModule!;

            // ================================================================
            // 레이아웃 상수 (디자인 시안 기준, 1080x1350 논리 좌표)
            // ================================================================
            const GRADIENT_TOP = 311;
            const GRADIENT_HEIGHT = 1040; // 1350 - 311 = 1039 → 디자인상 1040
            const CONTENT_LEFT = 80;
            const CONTENT_RIGHT = 80;
            const CONTENT_WIDTH = TEMPLATE_WIDTH - CONTENT_LEFT - CONTENT_RIGHT; // 920

            // 하단 컨텐츠: paddingBottom=120 → 컨텐츠 바닥 = 1350 - 120 = 1230
            // paddingTop=589 → 컨텐츠 시작 = 311 + 589 = 900
            const CONTENT_BOTTOM = TEMPLATE_HEIGHT - 120; // 1230
            const COLOR_LIGHT = '#F4F4F4';

            // ── 1. 그라디언트 오버레이 (0 → 80% black) ──
            if (!gradientRef.current) {
                gradientRef.current = new Rect({
                    left: 0,
                    top: GRADIENT_TOP,
                    width: TEMPLATE_WIDTH,
                    height: GRADIENT_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(gradientRef.current);
            }

            const gradFill = new fabricMod.Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 0, y2: GRADIENT_HEIGHT },
                colorStops: [
                    { offset: 0, color: 'rgba(0,0,0,0)' },
                    { offset: 1, color: 'rgba(0,0,0,0.80)' }
                ]
            });
            gradientRef.current.set({
                fill: gradFill,
                left: 0,
                top: GRADIENT_TOP,
                width: TEMPLATE_WIDTH,
                height: GRADIENT_HEIGHT
            });

            // ── 날짜/시간/조/멤버 (하단 블록) ──
            // 이 블록을 먼저 계산해야 상단 블록 위치를 결정할 수 있음
            const INFO_FONT_SIZE = 25;
            const INFO_LINE_HEIGHT = 1.5; // lineHeight 37.5 / 25

            // 날짜 텍스트
            const dateStr = dateText || '2026-00-00(토)';
            if (!dateTextRef.current) {
                dateTextRef.current = new IText(dateStr, {
                    left: CONTENT_LEFT,
                    top: 0, // 나중에 설정
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: INFO_FONT_SIZE,
                    fontWeight: '500',
                    fill: 'white',
                    lineHeight: INFO_LINE_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(dateTextRef.current);
            } else {
                dateTextRef.current.set({ text: dateStr });
            }

            // 시간 텍스트 (날짜 옆에)
            const timeStr = timeText || '오후 정기출사';
            if (!timeTextRef.current) {
                timeTextRef.current = new IText(timeStr, {
                    left: 0, // 나중에 설정
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: INFO_FONT_SIZE,
                    fontWeight: '500',
                    fill: 'white',
                    lineHeight: INFO_LINE_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(timeTextRef.current);
            } else {
                timeTextRef.current.set({ text: timeStr });
            }

            // 조 텍스트
            const groupStr = groupNum || '0조';
            if (!groupTextRef.current) {
                groupTextRef.current = new IText(groupStr, {
                    left: CONTENT_LEFT,
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: INFO_FONT_SIZE,
                    fontWeight: '700',
                    fill: 'white',
                    lineHeight: INFO_LINE_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(groupTextRef.current);
            } else {
                groupTextRef.current.set({ text: groupStr });
            }

            // 멤버 텍스트
            const membersStr = members || '샘플회원1 샘플회원2 샘플회원3 샘플회원4 샘플회원5';
            if (!membersTextRef.current) {
                membersTextRef.current = new IText(membersStr, {
                    left: 0,
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: INFO_FONT_SIZE,
                    fontWeight: '500',
                    fill: 'white',
                    lineHeight: INFO_LINE_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(membersTextRef.current);
            } else {
                membersTextRef.current.set({ text: membersStr });
            }

            // 하단 정보 블록 높이 계산
            const infoLineH = 38; // 각 라인 높이 (fontSize 25 * lineHeight 1.5 ≈ 37.5)
            const infoBlockHeight = infoLineH + 8 + infoLineH; // 날짜줄 + gap8 + 조줄
            const infoBlockTop = CONTENT_BOTTOM - infoBlockHeight;

            // 날짜 + 시간 라인 위치
            dateTextRef.current!.set({
                left: CONTENT_LEFT,
                top: infoBlockTop,
            });
            const dateWidth = dateTextRef.current!.calcTextWidth() + 12; // gap 12
            timeTextRef.current!.set({
                left: CONTENT_LEFT + dateWidth,
                top: infoBlockTop,
            });

            // 조 + 멤버 라인 위치
            const groupLineTop = infoBlockTop + infoLineH + 8;
            groupTextRef.current!.set({
                left: CONTENT_LEFT,
                top: groupLineTop,
            });
            const groupWidth = groupTextRef.current!.calcTextWidth() + 12;
            membersTextRef.current!.set({
                left: CONTENT_LEFT + groupWidth,
                top: groupLineTop,
            });

            // ── 상단 블록 (카테고리 배지 + 바 + 타이틀) ──
            // 상단 블록과 하단 블록 사이 gap = 48
            const UPPER_LOWER_GAP = 48;
            const upperBlockBottom = infoBlockTop - UPPER_LOWER_GAP;

            // 타이틀 (90px bold, 배치 기준: 상단블록 하단)
            const TITLE_FONT_SIZE = 90;
            const titleStr = locationName || '출사지 이름';
            if (!titleRef.current) {
                titleRef.current = new IText(titleStr, {
                    left: CONTENT_LEFT + 8 + 16, // bar(8) + gap(16)
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: TITLE_FONT_SIZE,
                    fontWeight: 700,
                    fill: 'white',
                    width: CONTENT_WIDTH - 8 - 16, // 896
                    selectable: false,
                    evented: false,
                });
                canvas.add(titleRef.current);
            } else {
                titleRef.current.set({
                    text: titleStr,
                    fontFamily: 'sans-serif',
                    fontSize: TITLE_FONT_SIZE,
                    fontWeight: 700,
                    fill: 'white',
                });
            }

            // 타이틀 높이 계산 후 위치 설정
            const titleHeight = titleRef.current.calcTextHeight?.() || titleRef.current.height || 75;
            const titleTop = upperBlockBottom - titleHeight;
            titleRef.current.set({ top: titleTop, left: CONTENT_LEFT + 8 + 16 });

            // 세로 바 (타이틀 왼쪽, 같은 높이)
            if (!verticalBarRef.current) {
                verticalBarRef.current = new Rect({
                    left: CONTENT_LEFT,
                    top: titleTop,
                    width: 8,
                    height: titleHeight,
                    fill: COLOR_LIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(verticalBarRef.current);
            } else {
                verticalBarRef.current.set({
                    top: titleTop,
                    height: titleHeight,
                });
            }

            // 카테고리 배지 (타이틀 위 gap 24)
            const BADGE_GAP = 24;
            const BADGE_FONT_SIZE = 24;
            const BADGE_LINE_HEIGHT = 1.5; // lineHeight 36 / fontSize 24
            const BADGE_PY = 4;
            const BADGE_PX = 20;
            const BADGE_STROKE = 1.5;

            const catStr = category || '정기출사';
            if (!categoryTextRef.current) {
                categoryTextRef.current = new IText(catStr, {
                    left: 0,
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: BADGE_FONT_SIZE,
                    fontWeight: '600',
                    fill: 'white',
                    lineHeight: BADGE_LINE_HEIGHT,
                    selectable: false,
                    evented: false,
                });
                canvas.add(categoryTextRef.current);
            } else {
                categoryTextRef.current.set({ text: catStr });
            }

            const catTextW = categoryTextRef.current.calcTextWidth();
            // font-size 24, line-height 36 (CSS) -> 텍스트 블록의 시각적 높이는 36이어야 함 (fabric에서는 다르게 측정될 수 있음)
            const catTextH_visual = 36;
            const badgeW = catTextW + BADGE_PX * 2;
            const badgeH = catTextH_visual + BADGE_PY * 2; // 36 + 8 = 44px (맞춤)
            const badgeTop = titleTop - BADGE_GAP - badgeH;

            // 배지 테두리 (둥근 사각형, stroke 안쪽 정렬 = outlineOffset -1.5px)
            const halfStroke = BADGE_STROKE / 2;
            if (!categoryBadgeBorderRef.current) {
                categoryBadgeBorderRef.current = new Rect({
                    left: CONTENT_LEFT + halfStroke,
                    top: badgeTop + halfStroke,
                    width: badgeW - BADGE_STROKE,
                    height: badgeH - BADGE_STROKE,
                    rx: badgeH / 2, // 완전한 둥근 모양을 위해 높이의 절반 적용
                    ry: badgeH / 2,
                    fill: 'transparent',
                    stroke: COLOR_LIGHT,
                    strokeWidth: BADGE_STROKE,
                    strokeUniform: true,
                    selectable: false,
                    evented: false,
                });
                canvas.add(categoryBadgeBorderRef.current);
            } else {
                categoryBadgeBorderRef.current.set({
                    left: CONTENT_LEFT + halfStroke,
                    top: badgeTop + halfStroke,
                    width: badgeW - BADGE_STROKE,
                    height: badgeH - BADGE_STROKE,
                    rx: badgeH / 2,
                    ry: badgeH / 2,
                });
            }

            // 카테고리 텍스트 위치 (배지 내부 센터 맞춤)
            // fabric.js 의 IText originY 가 top 일 때 실제 텍스트 위아래 남는 공간 보정
            const actualTextH = categoryTextRef.current.height || catTextH_visual;
            const textCenterTop = badgeTop + (badgeH / 2) - (actualTextH / 2);

            categoryTextRef.current.set({
                left: CONTENT_LEFT + BADGE_PX,
                top: textCenterTop,
            });

            // ── 좌상단 로고 ──
            if (!logoImageRef.current) {
                try {
                    const logoImg = await FabricImage.fromURL('/Logo_Luminar_White.png');
                    const LOGO_TARGET_SIZE = 56;
                    const logoScale = LOGO_TARGET_SIZE / Math.max(logoImg.width || 1, logoImg.height || 1);

                    logoImg.set({
                        left: 80,
                        top: 80,
                        scaleX: logoScale,
                        scaleY: logoScale,
                        selectable: false,
                        evented: false,
                    });

                    canvas.add(logoImg);
                    logoImageRef.current = logoImg;

                    canvas.bringObjectToFront(logoImg);
                } catch (e) {
                    console.warn('로고 로드 실패:', e);
                }
            }

            // ── 날짜 위 구분선 ──
            if (!dividerRef.current) {
                dividerRef.current = new Line([0, 0, CONTENT_WIDTH, 0], {
                    left: CONTENT_LEFT,
                    top: 1123,
                    stroke: textStyle.fill || COLOR_LIGHT, // text.fill 을 따르거나 디폴트
                    strokeWidth: 1, // 1px
                    selectable: false,
                    evented: false,
                });
                canvas.add(dividerRef.current);
            } else {
                dividerRef.current.set({
                    stroke: textStyle.fill || COLOR_LIGHT,
                });
            }

            // ── 스택 순서 정렬 ──
            // Photo → Dim → Gradient → Badge → Bar → Title → Info → Logo
            if (dimOverlayRef.current) canvas.bringObjectToFront(dimOverlayRef.current);
            if (gradientRef.current) canvas.bringObjectToFront(gradientRef.current);
            if (categoryBadgeBorderRef.current) canvas.bringObjectToFront(categoryBadgeBorderRef.current);
            if (categoryTextRef.current) canvas.bringObjectToFront(categoryTextRef.current);
            if (verticalBarRef.current) canvas.bringObjectToFront(verticalBarRef.current);
            if (titleRef.current) canvas.bringObjectToFront(titleRef.current);
            if (dividerRef.current) canvas.bringObjectToFront(dividerRef.current);
            if (dateTextRef.current) canvas.bringObjectToFront(dateTextRef.current);
            if (timeTextRef.current) canvas.bringObjectToFront(timeTextRef.current);
            if (groupTextRef.current) canvas.bringObjectToFront(groupTextRef.current);
            if (membersTextRef.current) canvas.bringObjectToFront(membersTextRef.current);
            if (logoImageRef.current) canvas.bringObjectToFront(logoImageRef.current);

        }, [category, locationName, dateText, timeText, groupNum, members, textStyle]);

        // 배경 사진 로드
        const loadPhoto = useCallback(async (canvas: import('fabric').Canvas, url: string, _displayScale: number) => {
            const { FabricImage } = await getFabric();
            const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

            const sx = TEMPLATE_WIDTH / img.width!;
            const sy = TEMPLATE_HEIGHT / img.height!;

            // 화면을 꽉 채우도록 (cover 모드)
            const imgScale = Math.max(sx, sy);

            img.set({
                scaleX: imgScale,
                scaleY: imgScale,
                left: (TEMPLATE_WIDTH - img.width! * imgScale) / 2,
                top: (TEMPLATE_HEIGHT - img.height! * imgScale) / 2,
                selectable: true,
                lockRotation: false,
                lockScalingX: false,
                lockScalingY: false,
                lockUniScaling: true,
                hasControls: true,
                hasBorders: true,
                cornerSize: 12,
                transparentCorners: false,
                cornerColor: '#0ea5e9',
                cornerStrokeColor: '#ffffff',
                // @ts-ignore
                uid: 'background-photo',
            });

            if (bgImageRef.current) canvas.remove(bgImageRef.current);
            canvas.add(img);
            canvas.sendObjectToBack(img);
            const objects = canvas.getObjects();
            const bg = objects.find((o: any) => (o as any).fill === '#DDDDDD');
            if (bg) canvas.sendObjectToBack(bg);
            bgImageRef.current = img;

        }, []);

        // ── 메인 초기화 Effect (Canvas Init) ──
        useEffect(() => {
            if (!canvasEl.current || containerSize.width === 0 || containerSize.height === 0) return;
            let cancelled = false;

            const { width, height, scale, offsetX, offsetY } = getDisplaySize();

            (async () => {
                const { Canvas, Rect, Line, Path } = await getFabric();
                if (cancelled) return;

                if (fabricRef.current) {
                    fabricRef.current.dispose();
                }

                const canvas = new Canvas(canvasEl.current!, {
                    width: width,
                    height: height,
                    backgroundColor: 'transparent',
                    selection: false,
                    controlsAboveOverlay: false,
                    preserveObjectStacking: true
                });

                canvas.setViewportTransform([scale, 0, 0, scale, offsetX, offsetY]);

                // 템플릿 영역 배경
                const templateBg = new Rect({
                    left: 0, top: 0,
                    width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT,
                    fill: '#DDDDDD',
                    stroke: 'transparent',
                    selectable: false, evented: false
                });
                canvas.add(templateBg);

                // 템플릿 밖 반투명 어둡게(흰 비네팅) 처리 제거 요청으로 주석 처리
                /*
                const BIG = 99999;
                const dimColor = 'rgba(244, 244, 245, 0.85)';
                const dimPathStr =
                    `M ${-BIG} ${-BIG} L ${BIG + TEMPLATE_WIDTH} ${-BIG} L ${BIG + TEMPLATE_WIDTH} ${BIG + TEMPLATE_HEIGHT} L ${-BIG} ${BIG + TEMPLATE_HEIGHT} Z ` +
                    `M 0 0 L 0 ${TEMPLATE_HEIGHT} L ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT} L ${TEMPLATE_WIDTH} 0 Z`;
                const dimOverlay = new Path(dimPathStr, {
                    fill: dimColor,
                    fillRule: 'evenodd',
                    stroke: 'transparent',
                    selectable: false,
                    evented: false,
                });
                dimOverlayRef.current = dimOverlay;
                canvas.add(dimOverlay);
                */

                // 템플릿 경계선 (모든 변에서 보이도록 추가)
                const borderRect = new Rect({
                    left: 0, top: 0,
                    width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT,
                    fill: 'transparent',
                    stroke: 'rgba(0, 0, 0, 0.2)',
                    strokeWidth: 2 / scale,
                    selectable: false, evented: false,
                });
                borderRectRef.current = borderRect;
                canvas.add(borderRect);

                // 스냅핑 가이드라인
                vLineRef.current = new Line([TEMPLATE_WIDTH / 2, 0, TEMPLATE_WIDTH / 2, TEMPLATE_HEIGHT], {
                    stroke: '#0ea5e9', strokeWidth: 2 / scale, selectable: false, evented: false, opacity: 0,
                    strokeDashArray: [5, 5]
                });
                hLineRef.current = new Line([0, TEMPLATE_HEIGHT / 2, TEMPLATE_WIDTH, TEMPLATE_HEIGHT / 2], {
                    stroke: '#0ea5e9', strokeWidth: 2 / scale, selectable: false, evented: false, opacity: 0,
                    strokeDashArray: [5, 5]
                });
                canvas.add(vLineRef.current, hLineRef.current);

                // 센터 스냅핑 로직
                const SNAP_ZONE = 25;
                const checkCenterSnap = (obj: import('fabric').Object) => {
                    const cx = obj.left! + (obj.width! * obj.scaleX!) / 2;
                    const cy = obj.top! + (obj.height! * obj.scaleY!) / 2;
                    const centerX = TEMPLATE_WIDTH / 2;
                    const centerY = TEMPLATE_HEIGHT / 2;

                    let snapped = false;

                    if (Math.abs(cx - centerX) < SNAP_ZONE) {
                        obj.set('left', centerX - (obj.width! * obj.scaleX!) / 2);
                        vLineRef.current?.set({ opacity: 1 });
                        snapped = true;
                    } else {
                        vLineRef.current?.set({ opacity: 0 });
                    }

                    if (Math.abs(cy - centerY) < SNAP_ZONE) {
                        obj.set('top', centerY - (obj.height! * obj.scaleY!) / 2);
                        hLineRef.current?.set({ opacity: 1 });
                        snapped = true;
                    } else {
                        hLineRef.current?.set({ opacity: 0 });
                    }

                    if (snapped) {
                        canvas.bringObjectToFront(vLineRef.current!);
                        canvas.bringObjectToFront(hLineRef.current!);
                    }
                };

                canvas.on('object:moving', (e) => {
                    const obj = e.target;
                    if (obj === bgImageRef.current) {
                        checkCenterSnap(obj);
                    }
                });

                canvas.on('object:scaling', (e) => {
                    const obj = e.target;
                    if (obj === bgImageRef.current) {
                        checkCenterSnap(obj);
                    }
                });

                canvas.on('mouse:up', () => {
                    vLineRef.current?.set({ opacity: 0 });
                    hLineRef.current?.set({ opacity: 0 });
                    canvas.renderAll();
                });

                fabricRef.current = canvas;
                bgImageRef.current = null;
                gradientRef.current = null;
                categoryBadgeBorderRef.current = null;
                categoryTextRef.current = null;
                verticalBarRef.current = null;
                titleRef.current = null;
                dateTextRef.current = null;
                timeTextRef.current = null;
                groupTextRef.current = null;
                membersTextRef.current = null;
                logoImageRef.current = null;
                dividerRef.current = null;

                if (photoUrl) {
                    await loadPhoto(canvas, photoUrl, scale);
                }

                await updateTextLayers(canvas, scale);

                canvas.renderAll();

            })();

            return () => { cancelled = true; };
        }, [containerSize, getDisplaySize, photoUrl, loadPhoto]);

        // 텍스트 상태 변경 시 레이어 업데이트
        useEffect(() => {
            const canvas = fabricRef.current;
            const { scale } = getDisplaySize();
            if (canvas) {
                updateTextLayers(canvas, scale).then(() => {
                    canvas.renderAll();
                });
            }
        }, [category, locationName, dateText, timeText, groupNum, members, textStyle, updateTextLayers, getDisplaySize]);


        useImperativeHandle(ref, () => ({
            async exportJPG(): Promise<Blob | null> {
                if (!fabricRef.current) return null;
                const canvas = fabricRef.current;

                canvas.discardActiveObject();

                if (vLineRef.current) vLineRef.current.set({ opacity: 0 });
                if (hLineRef.current) hLineRef.current.set({ opacity: 0 });
                if (dimOverlayRef.current) dimOverlayRef.current.set({ visible: false });
                if (borderRectRef.current) borderRectRef.current.set({ visible: false });

                canvas.renderAll();

                const tempVp = canvas.viewportTransform;
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

                // 템플릿 영역만 별도 캔버스로 추출 (고해상도 2x 추출)
                const exportCanvas = canvas.toCanvasElement(2, {
                    left: 0,
                    top: 0,
                    width: TEMPLATE_WIDTH,
                    height: TEMPLATE_HEIGHT
                });

                if (tempVp) canvas.setViewportTransform(tempVp);
                
                if (dimOverlayRef.current) dimOverlayRef.current.set({ visible: true });
                if (borderRectRef.current) borderRectRef.current.set({ visible: true });
                
                canvas.renderAll();

                // toBlob으로 정확한 JPEG Blob 생성 (quality 1.0 = 100%)
                return new Promise<Blob | null>((resolve) => {
                    exportCanvas.toBlob(
                        (blob) => resolve(blob),
                        'image/jpeg',
                        1.0
                    );
                });
            }
        }));

        return (
            <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[var(--color-surface)] flex items-center justify-center">
                <div className="shadow-xl rounded overflow-hidden">
                    <canvas ref={canvasEl} />
                </div>
            </div>
        );
    },
);

ThumbnailEditor.displayName = 'ThumbnailEditor';
export default ThumbnailEditor;
