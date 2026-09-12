import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveTab } from '../types';
import { SupportedLang, t } from '../config/i18n';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lang?: SupportedLang;
}

interface NavItem {
  key: ActiveTab;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
  { key: 'wizard', label: 'Wizard', iconActive: 'flash', iconInactive: 'flash-outline' },
  { key: 'situations', label: 'Situations', iconActive: 'shield', iconInactive: 'shield-outline' },
  { key: 'deadlines', label: 'Monitor', iconActive: 'calendar', iconInactive: 'calendar-outline' },
  { key: 'profile', label: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
];

interface TabButtonProps {
  item: NavItem;
  index: number;
  hoveredIdx: number | null;
  isActive: boolean;
  lang?: SupportedLang;
}

const TabButton: React.FC<TabButtonProps> = ({
  item,
  index,
  hoveredIdx,
  isActive,
  lang = 'en',
}) => {
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // 1. Apple Fisheye Wave Focus (Subtle in-place magnification)
  useEffect(() => {
    let target = 0;
    if (hoveredIdx !== null) {
      const dist = Math.abs(hoveredIdx - index);
      if (dist === 0) {
        target = 1.0; // Directly hovered/active
      } else if (dist === 1) {
        target = 0.4; // Neighbor
      } else if (dist === 2) {
        target = 0.12; // Far neighbor
      }
    }

    Animated.spring(hoverAnim, {
      toValue: target,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [hoveredIdx, index]);

  // 2. iOS 18 Micro-Bounce Tactile Spring (Subtle in-place pop, no vertical displacement)
  useEffect(() => {
    if (isActive) {
      bounceAnim.setValue(0);
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 180,
        useNativeDriver: true,
      }).start();
    } else {
      bounceAnim.setValue(0);
    }
  }, [isActive]);

  // Purely in-place scale — NO vertical translateY so icons stay locked inside the bar
  const hoverScale = hoverAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.03, 1.06],
  });

  const glowOpacity = hoverAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.35, 0.85],
  });

  // Tactile micro-bounce: subtle scale pulse in place
  const iconBounceScale = bounceAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [1, 1.08, 0.98, 1],
  });

  // Very gentle micro-wiggle (max 2 degrees)
  const iconRotate = bounceAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '-2deg', '1.5deg', '-0.5deg', '0deg'],
  });

  const isDirectlyHovered = hoveredIdx === index;
  const isSideNeighbor = hoveredIdx !== null && Math.abs(hoveredIdx - index) === 1;

  return (
    <View style={styles.tabItem} pointerEvents="none">
      <Animated.View
        style={[
          styles.tabItemInner,
          {
            transform: [{ scale: hoverScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            {
              transform: [
                { scale: iconBounceScale },
                { rotate: iconRotate },
              ],
            },
          ]}
        >
          {/* Frosted Capsule Backlight on Hover (when tab is not active) */}
          {!isActive && (
            <Animated.View
              style={[
                styles.hoverGlowBox,
                {
                  opacity: glowOpacity,
                },
              ]}
            />
          )}

          <Ionicons
            name={isActive ? item.iconActive : (isDirectlyHovered ? item.iconActive : item.iconInactive)}
            size={isActive ? 18 : 20}
            color={isActive ? '#ffffff' : (isDirectlyHovered ? '#1a1a5e' : isSideNeighbor ? '#334155' : '#6b7280')}
          />
        </Animated.View>

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            isActive && styles.labelActive,
            !isActive && isDirectlyHovered && styles.labelHovered,
            !isActive && isSideNeighbor && styles.labelNeighbor,
          ]}
        >
          {item.key === 'home' ? t('nav_home', lang) :
           item.key === 'wizard' ? t('nav_wizard', lang) :
           item.key === 'situations' ? t('nav_situations', lang) :
           item.key === 'deadlines' ? t('nav_deadlines', lang) :
           item.key === 'profile' ? t('nav_profile', lang) : item.label}
        </Text>

        {/* Active micro-dot indicator */}
        <Animated.View
          style={[
            styles.activeDot,
            {
              opacity: isActive ? 1 : 0,
              transform: [{ scale: isActive ? 1 : 0 }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  lang = 'en',
}) => {
  const insets = useSafeAreaInsets();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  const containerRef = useRef<View>(null);
  const containerLayoutRef = useRef({ pageX: 0, width: Dimensions.get('window').width });

  const activeIndex = NAV_ITEMS.findIndex(item => item.key === activeTab);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  const currentTabRef = useRef(safeActiveIndex);
  currentTabRef.current = safeActiveIndex;
  const isDraggingRef = useRef(false);

  // 1. Sliding Liquid Spring Pill Controller
  const slidingPosition = useRef(new Animated.Value(safeActiveIndex)).current;
  const stretchAnim = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef(safeActiveIndex);

  useEffect(() => {
    const dist = Math.abs(safeActiveIndex - prevIndexRef.current);
    prevIndexRef.current = safeActiveIndex;

    if (dist > 0) {
      stretchAnim.setValue(1);
      // Fluid liquid stretch while gliding horizontally
      Animated.sequence([
        Animated.timing(stretchAnim, {
          toValue: dist === 1 ? 1.12 : 1.20,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(stretchAnim, {
          toValue: 1,
          friction: 6.5,
          tension: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }

    Animated.spring(slidingPosition, {
      toValue: safeActiveIndex,
      friction: 7.5,
      tension: 85,
      useNativeDriver: true,
    }).start();
  }, [safeActiveIndex]);

  const getIndexFromPageX = (pageX: number): number => {
    const width = containerLayoutRef.current.width || containerWidth || Dimensions.get('window').width;
    const startX = containerLayoutRef.current.pageX || 0;
    const localX = pageX - startX;
    const tabWidth = width / NAV_ITEMS.length;
    if (tabWidth <= 0) return 0;
    const rawIdx = Math.floor(localX / tabWidth);
    return Math.max(0, Math.min(NAV_ITEMS.length - 1, rawIdx));
  };

  const selectTabByIndex = (idx: number, force = false) => {
    const clamped = Math.max(0, Math.min(NAV_ITEMS.length - 1, idx));
    if (clamped !== currentTabRef.current || force) {
      currentTabRef.current = clamped;
      onSelectTab(NAV_ITEMS[clamped].key);
    }
  };

  // ─── Native Gesture PanResponder for Tap & Continuous Sliding ─────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt, gestureState) => {
        isDraggingRef.current = false;
        const pageX = evt.nativeEvent.pageX || gestureState.x0;
        const idx = getIndexFromPageX(pageX);
        setHoveredIdx(idx);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 4) {
          isDraggingRef.current = true;
        }
        const pageX = evt.nativeEvent.pageX || gestureState.moveX;
        const idx = getIndexFromPageX(pageX);
        setHoveredIdx(idx);
      },

      onPanResponderRelease: (evt, gestureState) => {
        const pageX = evt.nativeEvent.pageX || gestureState.moveX || gestureState.x0;

        // Check if quick flick / swipe
        if (Math.abs(gestureState.vx) > 0.35 && Math.abs(gestureState.dx) > 20) {
          if (gestureState.dx > 0 && currentTabRef.current < NAV_ITEMS.length - 1) {
            selectTabByIndex(currentTabRef.current + 1, true);
          } else if (gestureState.dx < 0 && currentTabRef.current > 0) {
            selectTabByIndex(currentTabRef.current - 1, true);
          }
        } else {
          // Tap or direct release on tab
          const idx = getIndexFromPageX(pageX);
          selectTabByIndex(idx, true);
        }
        isDraggingRef.current = false;
        setHoveredIdx(null);
      },

      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        setHoveredIdx(null);
      },
    })
  ).current;

  // Web Pointer Handlers with proper pointer capture for uninterrupted dragging
  const handlePointerDown = (e: any) => {
    if (Platform.OS === 'web') {
      try {
        (e.target as any)?.setPointerCapture?.(e.pointerId);
      } catch {}
      isDraggingRef.current = true;
      const rect = (containerRef.current as any)?.getBoundingClientRect?.() || e.currentTarget?.getBoundingClientRect?.();
      if (rect) {
        containerLayoutRef.current = { pageX: rect.left, width: rect.width };
        const localX = e.clientX - rect.left;
        const idx = Math.max(0, Math.min(NAV_ITEMS.length - 1, Math.floor(localX / (rect.width / NAV_ITEMS.length))));
        setHoveredIdx(idx);
        selectTabByIndex(idx, true);
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (Platform.OS === 'web') {
      const rect = (containerRef.current as any)?.getBoundingClientRect?.() || e.currentTarget?.getBoundingClientRect?.();
      if (rect) {
        containerLayoutRef.current = { pageX: rect.left, width: rect.width };
        const localX = e.clientX - rect.left;
        const idx = Math.max(0, Math.min(NAV_ITEMS.length - 1, Math.floor(localX / (rect.width / NAV_ITEMS.length))));
        setHoveredIdx(idx);
        if (isDraggingRef.current) {
          selectTabByIndex(idx);
        }
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (Platform.OS === 'web') {
      try {
        (e.target as any)?.releasePointerCapture?.(e.pointerId);
      } catch {}
      isDraggingRef.current = false;
      setHoveredIdx(null);
    }
  };

  const updateMeasurements = () => {
    containerRef.current?.measure((x, y, width, height, pageX) => {
      if (width > 0) {
        containerLayoutRef.current = { pageX: pageX || 0, width };
        setContainerWidth(width);
      }
    });
  };

  const handleLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setContainerWidth(w);
      containerLayoutRef.current.width = w;
    }
    updateMeasurements();
  };

  const tabWidth = containerWidth / NAV_ITEMS.length;
  const pillWidth = 48;
  const pillLeftOffset = (tabWidth - pillWidth) / 2;
  const barContentHeight = 62;
  const bottomPadding = Math.max(insets.bottom, 6);
  const totalBarHeight = barContentHeight + bottomPadding;

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          height: totalBarHeight,
          paddingBottom: bottomPadding,
        },
      ]}
      onLayout={handleLayout}
      onPointerLeave={() => {
        setHoveredIdx(null);
        isDraggingRef.current = false;
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...panResponder.panHandlers}
    >
      {/* Top Slide Handle Indicator */}
      <View style={styles.sliderHandleWrap} pointerEvents="none">
        <View style={styles.sliderHandle} />
      </View>

      {/* 1. Sliding Liquid Spring Pill Indicator (Concentric with icon wrapper) */}
      {containerWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingPillContainer,
            {
              width: pillWidth,
              transform: [
                {
                  translateX: slidingPosition.interpolate({
                    inputRange: [0, 1, 2, 3, 4],
                    outputRange: [
                      0 * tabWidth + pillLeftOffset,
                      1 * tabWidth + pillLeftOffset,
                      2 * tabWidth + pillLeftOffset,
                      3 * tabWidth + pillLeftOffset,
                      4 * tabWidth + pillLeftOffset,
                    ],
                  }),
                },
                {
                  scaleX: stretchAnim,
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#1a1a5e', '#312e81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.slidingPillGradient}
          >
            <View style={styles.specularShine} />
          </LinearGradient>
        </Animated.View>
      )}

      {/* 5 Navigation Tab Buttons */}
      {NAV_ITEMS.map((item, index) => (
        <TabButton
          key={item.key}
          item={item}
          index={index}
          hoveredIdx={hoveredIdx}
          isActive={activeTab === item.key}
          lang={lang}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1.5,
    borderTopColor: '#e8eaf0',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
        } as any)
      : {}),
  },
  sliderHandleWrap: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  sliderHandle: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
  },
  slidingPillContainer: {
    position: 'absolute',
    top: 7,
    left: 0,
    height: 30,
    zIndex: 1,
  },
  slidingPillGradient: {
    width: 48,
    height: 30,
    borderRadius: 15,
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  specularShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  tabItem: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 7,
    zIndex: 2,
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  hoverGlowBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f1f5f9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 2,
    letterSpacing: 0.15,
  },
  labelNeighbor: {
    color: '#334155',
  },
  labelHovered: {
    color: '#1a1a5e',
    fontWeight: '800',
  },
  labelActive: {
    color: '#1a1a5e',
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4f46e5',
    marginTop: 2,
  },
});

export default BottomNav;
