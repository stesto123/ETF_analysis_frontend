import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  LayoutRectangle,
} from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';

export type HelpTooltipProps = {
  title: string;
  description: string;
  accessibilityLabel?: string;
};

type AnchorDimensions = LayoutRectangle;

const TOOLTIP_MAX_WIDTH = 260;
const EDGE_PADDING = 16;
const OFFSET = 10;

export default function HelpTooltip({ title, description, accessibilityLabel }: HelpTooltipProps) {
  const { isDark } = useTheme();
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<AnchorDimensions | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: TOOLTIP_MAX_WIDTH, height: 0 });

  const handleOpen = useCallback(() => {
    if (!anchorRef.current) {
      setVisible(true);
      return;
    }

    anchorRef.current.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setVisible(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const positionStyle = useMemo(() => {
    if (!anchor) {
      return { top: EDGE_PADDING, left: EDGE_PADDING };
    }

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const tooltipWidth = tooltipSize.width || TOOLTIP_MAX_WIDTH;
    const tooltipHeight = tooltipSize.height || 0;

    let left = anchor.x + anchor.width + OFFSET;
    if (left + tooltipWidth > screenWidth - EDGE_PADDING) {
      left = anchor.x - tooltipWidth - OFFSET;
    }
    if (left < EDGE_PADDING) {
      left = EDGE_PADDING;
    }

    let top = anchor.y + anchor.height / 2 - tooltipHeight / 2;
    if (top + tooltipHeight > screenHeight - EDGE_PADDING) {
      top = screenHeight - tooltipHeight - EDGE_PADDING;
    }
    if (top < EDGE_PADDING) {
      top = EDGE_PADDING;
    }

    return { top, left };
  }, [anchor, tooltipSize.height, tooltipSize.width]);

  const tooltipBackground = isDark ? '#F3F4F6' : '#FFFFFF';
  const titleColor = '#111827';
  const bodyColor = '#374151';

  return (
    <View ref={anchorRef} collapsable={false} style={styles.anchorContainer}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? `${title} help`}
        accessibilityRole="button"
        onPress={handleOpen}
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconWrapper,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)',
            borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.18)',
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <HelpCircle size={16} color={isDark ? '#E5E7EB' : '#1F2937'} strokeWidth={1.8} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[styles.tooltipContainer, positionStyle, {
            backgroundColor: tooltipBackground,
            shadowColor: '#000000',
          }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width !== tooltipSize.width || height !== tooltipSize.height) {
              setTooltipSize({ width, height });
            }
          }}
        >
          <Text style={[styles.tooltipTitle, { color: titleColor }]}>{title}</Text>
          <Text style={[styles.tooltipBody, { color: bodyColor }]}>{description}</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  anchorContainer: {
    marginLeft: 4,
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tooltipContainer: {
    position: 'absolute',
    maxWidth: TOOLTIP_MAX_WIDTH,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  tooltipBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
