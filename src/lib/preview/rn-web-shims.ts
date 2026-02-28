/**
 * Shim files for React Native modules that don't have web equivalents.
 * These are injected into the Sandpack filesystem as node_modules so
 * that imports resolve without errors.
 */

/** expo-haptics -> no-op */
export const expoHapticsShim = `
const Haptics = {
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  selectionAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
};
export default Haptics;
export const { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType } = Haptics;
`;

/** expo-blur -> simple CSS backdrop-filter div */
export const expoBlurShim = `
import React from 'react';
import { View } from 'react-native';

export function BlurView({ intensity = 50, tint = 'default', style, children, ...props }) {
  const bgMap = { light: 'rgba(255,255,255,0.7)', dark: 'rgba(0,0,0,0.7)', default: 'rgba(255,255,255,0.5)' };
  return React.createElement(View, {
    style: [{ backdropFilter: 'blur(' + (intensity / 5) + 'px)', backgroundColor: bgMap[tint] || bgMap.default }, style],
    ...props,
  }, children);
}
export default { BlurView };
`;

/** react-native-reanimated -> minimal shim with Animated API */
export const reanimatedShim = `
import { Animated, Easing } from 'react-native';
import React from 'react';

export function useSharedValue(init) {
  const ref = React.useRef(new Animated.Value(init));
  return { value: init, _anim: ref.current };
}

export function useAnimatedStyle(fn) {
  return fn();
}

export function withTiming(toValue, config) { return toValue; }
export function withSpring(toValue, config) { return toValue; }
export function withDelay(delay, animation) { return animation; }
export function withSequence(...anims) { return anims[anims.length - 1]; }
export function withRepeat(animation, count, reverse) { return animation; }
export function runOnJS(fn) { return fn; }
export function runOnUI(fn) { return fn; }
export function interpolate(value, input, output) { return output[0]; }

export function cancelAnimation() {}
export function useDerivedValue(fn) { return { value: fn() }; }
export function useAnimatedScrollHandler() { return {}; }
export function useAnimatedRef() { return React.useRef(null); }
export const Easing = { linear: (t) => t, ease: (t) => t, bezier: () => (t) => t, in: (e) => e, out: (e) => e, inOut: (e) => e };
export const ReduceMotion = { System: 0, Always: 1, Never: 2 };

// Entering/Exiting animation presets (builder pattern stubs)
function makeAnimPreset() {
  var obj = {};
  var chain = function() { return obj; };
  obj.delay = chain;
  obj.duration = chain;
  obj.springify = chain;
  obj.damping = chain;
  obj.stiffness = chain;
  obj.mass = chain;
  obj.overshootClamping = chain;
  obj.restDisplacementThreshold = chain;
  obj.restSpeedThreshold = chain;
  obj.withInitialValues = chain;
  obj.withCallback = chain;
  obj.easing = chain;
  obj.randomDelay = chain;
  obj.reduceMotion = chain;
  obj.build = function() { return undefined; };
  return obj;
}
export var FadeIn = makeAnimPreset();
export var FadeInUp = makeAnimPreset();
export var FadeInDown = makeAnimPreset();
export var FadeInLeft = makeAnimPreset();
export var FadeInRight = makeAnimPreset();
export var FadeOut = makeAnimPreset();
export var FadeOutUp = makeAnimPreset();
export var FadeOutDown = makeAnimPreset();
export var FadeOutLeft = makeAnimPreset();
export var FadeOutRight = makeAnimPreset();
export var SlideInUp = makeAnimPreset();
export var SlideInDown = makeAnimPreset();
export var SlideInLeft = makeAnimPreset();
export var SlideInRight = makeAnimPreset();
export var SlideOutUp = makeAnimPreset();
export var SlideOutDown = makeAnimPreset();
export var SlideOutLeft = makeAnimPreset();
export var SlideOutRight = makeAnimPreset();
export var ZoomIn = makeAnimPreset();
export var ZoomOut = makeAnimPreset();
export var BounceIn = makeAnimPreset();
export var BounceInDown = makeAnimPreset();
export var BounceInUp = makeAnimPreset();
export var BounceOut = makeAnimPreset();
export var FlipInXUp = makeAnimPreset();
export var FlipInXDown = makeAnimPreset();
export var FlipInYLeft = makeAnimPreset();
export var FlipInYRight = makeAnimPreset();
export var StretchInX = makeAnimPreset();
export var StretchInY = makeAnimPreset();
export var LightSpeedInLeft = makeAnimPreset();
export var LightSpeedInRight = makeAnimPreset();
export var Layout = makeAnimPreset();
export var LinearTransition = makeAnimPreset();
export var SequencedTransition = makeAnimPreset();
export var FadingTransition = makeAnimPreset();
export var JumpingTransition = makeAnimPreset();

const createAnimatedComponent = (Component) => {
  const Wrapper = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  Wrapper.displayName = 'Animated.' + (Component.displayName || Component.name || 'Component');
  return Wrapper;
};

const ReanimatedDefault = {
  View: createAnimatedComponent(require('react-native').View),
  Text: createAnimatedComponent(require('react-native').Text),
  Image: createAnimatedComponent(require('react-native').Image),
  ScrollView: createAnimatedComponent(require('react-native').ScrollView),
  FlatList: createAnimatedComponent(require('react-native').FlatList),
  createAnimatedComponent,
};

export default ReanimatedDefault;
`;

/** expo-image -> img tag on web via react-native Image */
export const expoImageShim = `
import React from 'react';
import { Image as RNImage } from 'react-native';

export function Image({ source, style, contentFit, placeholder, ...props }) {
  const src = typeof source === 'string' ? { uri: source } : source;
  const resizeMode = contentFit === 'cover' ? 'cover' : contentFit === 'contain' ? 'contain' : 'cover';
  return React.createElement(RNImage, { source: src, style, resizeMode, ...props });
}
export default { Image };
`;

/** expo-status-bar -> no-op */
export const expoStatusBarShim = `
import React from 'react';
export function StatusBar() { return null; }
export function setStatusBarStyle() {}
export function setStatusBarBackgroundColor() {}
export function setStatusBarHidden() {}
export default { StatusBar, setStatusBarStyle, setStatusBarBackgroundColor, setStatusBarHidden };
`;

/** expo-linear-gradient */
export const expoLinearGradientShim = `
import React from 'react';
import { View } from 'react-native';

export function LinearGradient({ colors = ['#000', '#fff'], start, end, style, children, ...props }) {
  const s = start || { x: 0, y: 0 };
  const e = end || { x: 0, y: 1 };
  const angle = Math.atan2(e.y - s.y, e.x - s.x) * (180 / Math.PI) + 90;
  const gradient = 'linear-gradient(' + angle + 'deg, ' + colors.join(', ') + ')';
  return React.createElement(View, {
    style: [{ backgroundImage: gradient }, style],
    ...props,
  }, children);
}
export default { LinearGradient };
`;

/** expo-font -> no-op (web fonts loaded via CSS) */
export const expoFontShim = `
export function useFonts() { return [true]; }
export function loadAsync() { return Promise.resolve(); }
export function isLoaded() { return true; }
export default { useFonts, loadAsync, isLoaded };
`;

/** react-native-safe-area-context */
export const safeAreaContextShim = `
import React from 'react';
import { View } from 'react-native';

const defaultInsets = { top: 47, bottom: 34, left: 0, right: 0 };

export function SafeAreaProvider({ children }) {
  return React.createElement(View, { style: { flex: 1 } }, children);
}
export function SafeAreaView({ style, edges, children, ...props }) {
  const padding = {};
  const e = edges || ['top', 'bottom', 'left', 'right'];
  if (e.includes('top')) padding.paddingTop = defaultInsets.top;
  if (e.includes('bottom')) padding.paddingBottom = defaultInsets.bottom;
  if (e.includes('left')) padding.paddingLeft = defaultInsets.left;
  if (e.includes('right')) padding.paddingRight = defaultInsets.right;
  return React.createElement(View, { style: [{ flex: 1 }, padding, style], ...props }, children);
}
export function useSafeAreaInsets() { return defaultInsets; }
export function useSafeAreaFrame() { return { x: 0, y: 0, width: 393, height: 852 }; }
export default { SafeAreaProvider, SafeAreaView, useSafeAreaInsets, useSafeAreaFrame };
`;

/** @react-navigation shims */
export const reactNavigationNativeShim = `
import React from 'react';
export function NavigationContainer({ children }) { return children; }
export function useNavigation() {
  return { navigate: () => {}, goBack: () => {}, reset: () => {}, setOptions: () => {} };
}
export function useRoute() { return { params: {}, name: 'Screen' }; }
export function useFocusEffect() {}
export function useIsFocused() { return true; }
export function createNavigationContainerRef() { return { current: null }; }
export default { NavigationContainer, useNavigation, useRoute };
`;

/** react-native-gesture-handler */
export const gestureHandlerShim = `
import React from 'react';
import { View, TouchableOpacity, ScrollView as RNScrollView, FlatList as RNFlatList } from 'react-native';

export function GestureHandlerRootView({ children, style }) {
  return React.createElement(View, { style: [{ flex: 1 }, style] }, children);
}
export const GestureDetector = ({ children }) => children;
export const Gesture = {
  Pan: () => ({ onStart: () => Gesture.Pan(), onUpdate: () => Gesture.Pan(), onEnd: () => Gesture.Pan() }),
  Tap: () => ({ onStart: () => Gesture.Tap(), onEnd: () => Gesture.Tap() }),
  Pinch: () => ({ onStart: () => Gesture.Pinch(), onUpdate: () => Gesture.Pinch(), onEnd: () => Gesture.Pinch() }),
};
export const TouchableOpacity_ = TouchableOpacity;
export const ScrollView = RNScrollView;
export const FlatList = RNFlatList;
export function Swipeable({ children }) { return children; }
export function RectButton(props) { return React.createElement(TouchableOpacity, props); }
export default { GestureHandlerRootView, GestureDetector, Gesture, Swipeable };
`;

/** react-native-paper -> lightweight web shim with theme context */
export const reactNativePaperShim = `
import React from 'react';
import { View, Text as RNText, TouchableOpacity, TextInput as RNTextInput, Switch as RNSwitch, ActivityIndicator as RNActivityIndicator } from 'react-native';

const defaultTheme = {
  dark: false,
  roundness: 4,
  colors: {
    primary: '#3b82f6',
    accent: '#06b6d4',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#ef4444',
    text: '#000000',
    onSurface: '#000000',
    onBackground: '#000000',
    onPrimary: '#ffffff',
    disabled: '#9ca3af',
    placeholder: '#9ca3af',
    backdrop: 'rgba(0,0,0,0.5)',
    notification: '#ef4444',
    elevation: { level0: '#fff', level1: '#f5f5f5', level2: '#ebebeb', level3: '#e0e0e0', level4: '#d6d6d6', level5: '#cccccc' },
    surfaceVariant: '#e0e0e0',
    onSurfaceVariant: '#444444',
    outline: '#cccccc',
    inverseSurface: '#1a1a1a',
    inverseOnSurface: '#f5f5f5',
    inversePrimary: '#93c5fd',
    primaryContainer: '#dbeafe',
    onPrimaryContainer: '#1e3a5f',
    secondaryContainer: '#e0f2fe',
    onSecondaryContainer: '#164e63',
    tertiary: '#8b5cf6',
    tertiaryContainer: '#ede9fe',
    onTertiaryContainer: '#3b0764',
    errorContainer: '#fee2e2',
    onErrorContainer: '#7f1d1d',
    surfaceDisabled: 'rgba(0,0,0,0.12)',
    onSurfaceDisabled: 'rgba(0,0,0,0.38)',
  },
  fonts: {
    displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '400' },
    displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '400' },
    displaySmall: { fontFamily: 'System', fontSize: 36, fontWeight: '400' },
    headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '400' },
    headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '400' },
    headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '400' },
    titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '400' },
    titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '500' },
    titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '500' },
    bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' },
    bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
    bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' },
    labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '500' },
    labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' },
    labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' },
    default: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
  },
  animation: { scale: 1.0 },
};

const ThemeContext = React.createContext(defaultTheme);

export function PaperProvider({ theme, children }) {
  return React.createElement(ThemeContext.Provider, { value: theme || defaultTheme }, children);
}
export const Provider = PaperProvider;
export const DefaultTheme = defaultTheme;
export const MD3DarkTheme = { ...defaultTheme, dark: true, colors: { ...defaultTheme.colors, background: '#121212', surface: '#1e1e1e', text: '#ffffff', onSurface: '#ffffff', onBackground: '#ffffff' } };

export function useTheme() { return React.useContext(ThemeContext) || defaultTheme; }

export function Text({ variant, style, children, numberOfLines, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  const variantStyle = variant && theme.fonts[variant] ? theme.fonts[variant] : {};
  return React.createElement(RNText, { style: [{ color: theme.colors.text }, variantStyle, style], numberOfLines, ...props }, children);
}

export function Surface({ style, elevation, children, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  return React.createElement(View, {
    style: [{ backgroundColor: theme.colors.surface, borderRadius: theme.roundness }, style],
    ...props
  }, children);
}

export function Button({ mode, onPress, style, labelStyle, children, icon, disabled, loading, compact, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  const bg = mode === 'contained' ? theme.colors.primary : mode === 'outlined' ? 'transparent' : 'transparent';
  const color = mode === 'contained' ? theme.colors.onPrimary : theme.colors.primary;
  const border = mode === 'outlined' ? { borderWidth: 1, borderColor: theme.colors.outline } : {};
  return React.createElement(TouchableOpacity, {
    onPress: disabled ? undefined : onPress,
    style: [{ backgroundColor: bg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.roundness, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: disabled ? 0.5 : 1 }, border, style],
    ...props
  }, loading
    ? React.createElement(RNActivityIndicator, { color, size: 'small' })
    : React.createElement(RNText, { style: [{ color, fontWeight: '500', fontSize: 14 }, labelStyle] }, children)
  );
}

export function IconButton({ icon, onPress, size, iconColor, style, disabled, ...props }) {
  return React.createElement(TouchableOpacity, {
    onPress: disabled ? undefined : onPress,
    style: [{ width: size || 40, height: size || 40, alignItems: 'center', justifyContent: 'center', borderRadius: (size || 40) / 2, opacity: disabled ? 0.5 : 1 }, style],
    ...props
  }, React.createElement(RNText, { style: { fontSize: (size || 40) * 0.5, color: iconColor || '#666' } }, '\\u25CF'));
}

export function Card({ style, children, onPress, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  const Wrapper = onPress ? TouchableOpacity : View;
  return React.createElement(Wrapper, {
    onPress,
    style: [{ backgroundColor: theme.colors.surface, borderRadius: theme.roundness * 3, overflow: 'hidden' }, style],
    ...props
  }, children);
}
Card.Content = function CardContent({ style, children }) { return React.createElement(View, { style: [{ padding: 16 }, style] }, children); };
Card.Cover = function CardCover({ source, style }) { return React.createElement(View, { style: [{ height: 200, backgroundColor: '#e0e0e0' }, style] }); };
Card.Title = function CardTitle({ title, subtitle, style }) {
  return React.createElement(View, { style: [{ padding: 16 }, style] },
    React.createElement(RNText, { style: { fontSize: 16, fontWeight: '500' } }, title),
    subtitle ? React.createElement(RNText, { style: { fontSize: 14, color: '#666', marginTop: 2 } }, subtitle) : null
  );
};
Card.Actions = function CardActions({ style, children }) { return React.createElement(View, { style: [{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }, style] }, children); };

export function Chip({ children, onPress, selected, style, icon, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  return React.createElement(TouchableOpacity, {
    onPress,
    style: [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surfaceVariant, borderWidth: 1, borderColor: selected ? theme.colors.primary : 'transparent' }, style],
    ...props
  }, React.createElement(RNText, { style: { fontSize: 13, color: selected ? theme.colors.primary : theme.colors.onSurface } }, children));
}

export function FAB({ icon, onPress, style, label, small, ...props }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  return React.createElement(TouchableOpacity, {
    onPress,
    style: [{ backgroundColor: theme.colors.primaryContainer, width: small ? 40 : 56, height: small ? 40 : 56, borderRadius: small ? 12 : 16, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 16, right: 16 }, style],
    ...props
  }, React.createElement(RNText, { style: { color: theme.colors.onPrimaryContainer, fontSize: small ? 18 : 24 } }, '+'));
}

export function Divider({ style }) {
  return React.createElement(View, { style: [{ height: 1, backgroundColor: '#e0e0e0' }, style] });
}

export function ProgressBar({ progress, color, style }) {
  const theme = React.useContext(ThemeContext) || defaultTheme;
  return React.createElement(View, { style: [{ height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }, style] },
    React.createElement(View, { style: { height: '100%', width: ((progress || 0) * 100) + '%', backgroundColor: color || theme.colors.primary, borderRadius: 2 } })
  );
}

export function Searchbar({ value, onChangeText, placeholder, style, ...props }) {
  return React.createElement(View, { style: [{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 28, paddingHorizontal: 16, height: 48 }, style] },
    React.createElement(RNText, { style: { marginRight: 8, fontSize: 18 } }, '\\uD83D\\uDD0D'),
    React.createElement(RNTextInput, { value, onChangeText, placeholder, style: { flex: 1, fontSize: 16 }, ...props })
  );
}

export function Avatar() {}
Avatar.Text = function AvatarText({ label, size, style }) {
  const s = size || 40;
  return React.createElement(View, { style: [{ width: s, height: s, borderRadius: s/2, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }, style] },
    React.createElement(RNText, { style: { color: '#fff', fontSize: s * 0.4, fontWeight: 'bold' } }, label)
  );
};
Avatar.Icon = function AvatarIcon({ icon, size, style }) {
  const s = size || 40;
  return React.createElement(View, { style: [{ width: s, height: s, borderRadius: s/2, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }, style] },
    React.createElement(RNText, { style: { color: '#fff', fontSize: s * 0.4 } }, '\\u25CF')
  );
};
Avatar.Image = function AvatarImage({ source, size, style }) {
  const s = size || 40;
  return React.createElement(View, { style: [{ width: s, height: s, borderRadius: s/2, backgroundColor: '#e0e0e0' }, style] });
};

export function TextInput({ label, value, onChangeText, mode, style, ...props }) {
  return React.createElement(View, { style: [{ marginVertical: 4 }, style] },
    label ? React.createElement(RNText, { style: { fontSize: 12, color: '#666', marginBottom: 4 } }, label) : null,
    React.createElement(RNTextInput, { value, onChangeText, style: { borderWidth: mode === 'outlined' ? 1 : 0, borderBottomWidth: 1, borderColor: '#ccc', borderRadius: mode === 'outlined' ? 4 : 0, padding: 12, fontSize: 16 }, ...props })
  );
}

export function Switch(props) { return React.createElement(RNSwitch, props); }
export function Badge({ children, style }) {
  return React.createElement(View, { style: [{ backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, style] },
    React.createElement(RNText, { style: { color: '#fff', fontSize: 11, fontWeight: 'bold' } }, children)
  );
}
export function ActivityIndicator({ color, size, ...props }) { return React.createElement(RNActivityIndicator, { color, size, ...props }); }
export function Appbar() {}
Appbar.Header = function({ style, children }) { return React.createElement(View, { style: [{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 4, backgroundColor: '#fff' }, style] }, children); };
Appbar.BackAction = function({ onPress }) { return React.createElement(TouchableOpacity, { onPress, style: { padding: 8 } }, React.createElement(RNText, { style: { fontSize: 20 } }, '\\u2190')); };
Appbar.Content = function({ title, subtitle }) { return React.createElement(View, { style: { flex: 1, paddingHorizontal: 8 } }, React.createElement(RNText, { style: { fontSize: 18, fontWeight: '500' } }, title), subtitle ? React.createElement(RNText, { style: { fontSize: 12, color: '#666' } }, subtitle) : null); };
Appbar.Action = function({ icon, onPress }) { return React.createElement(TouchableOpacity, { onPress, style: { padding: 8 } }, React.createElement(RNText, { style: { fontSize: 20 } }, '\\u22EF')); };
export function List() {}
List.Item = function({ title, description, left, right, onPress, style }) { return React.createElement(TouchableOpacity, { onPress, style: [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }, style] }, left ? left({}) : null, React.createElement(View, { style: { flex: 1, marginLeft: left ? 8 : 0 } }, React.createElement(RNText, { style: { fontSize: 16 } }, title), description ? React.createElement(RNText, { style: { fontSize: 14, color: '#666', marginTop: 2 } }, description) : null), right ? right({}) : null); };
List.Section = function({ title, children, style }) { return React.createElement(View, { style }, title ? React.createElement(RNText, { style: { fontSize: 14, fontWeight: '500', color: '#666', paddingHorizontal: 16, paddingVertical: 8 } }, title) : null, children); };
List.Icon = function({ icon, color }) { return React.createElement(RNText, { style: { fontSize: 20, color: color || '#666' } }, '\\u25CF'); };

export function Snackbar({ visible, children, style }) {
  if (!visible) return null;
  return React.createElement(View, { style: [{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#333', padding: 16, margin: 8, borderRadius: 4 }, style] },
    React.createElement(RNText, { style: { color: '#fff' } }, children)
  );
}

export function Dialog() { return null; }
Dialog.Title = function({ children }) { return React.createElement(RNText, { style: { fontSize: 20, fontWeight: '500', padding: 16 } }, children); };
Dialog.Content = function({ children }) { return React.createElement(View, { style: { padding: 16 } }, children); };
Dialog.Actions = function({ children }) { return React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8 } }, children); };
export function Portal({ children }) { return children; }
export function Modal({ visible, children, style }) { if (!visible) return null; return React.createElement(View, { style: [{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }, style] }, children); }
export function Menu({ visible, anchor, children }) { return anchor; }
Menu.Item = function({ title, onPress }) { return React.createElement(TouchableOpacity, { onPress, style: { padding: 12 } }, React.createElement(RNText, null, title)); };

export function SegmentedButtons({ value, onValueChange, buttons, style }) {
  return React.createElement(View, { style: [{ flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' }, style] },
    (buttons || []).map(function(btn, i) {
      return React.createElement(TouchableOpacity, {
        key: btn.value || i,
        onPress: function() { onValueChange && onValueChange(btn.value); },
        style: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: value === btn.value ? '#3b82f6' : 'transparent' }
      }, React.createElement(RNText, { style: { color: value === btn.value ? '#fff' : '#000', fontSize: 13 } }, btn.label));
    })
  );
}

export function Tooltip({ title, children }) { return children; }
`;

/** @expo/vector-icons -> text-based fallback */
export const expoVectorIconsShim = `
import React from 'react';
import { Text } from 'react-native';

function createIconComponent(fontFamily) {
  function IconComponent({ name, size, color, style, ...props }) {
    return React.createElement(Text, {
      style: [{ fontFamily, fontSize: size || 24, color: color || '#000' }, style],
      ...props
    }, name ? String.fromCodePoint(0x25CF) : '');
  }
  IconComponent.displayName = fontFamily;
  return IconComponent;
}

export const MaterialCommunityIcons = createIconComponent('MaterialCommunityIcons');
export const MaterialIcons = createIconComponent('MaterialIcons');
export const Ionicons = createIconComponent('Ionicons');
export const FontAwesome = createIconComponent('FontAwesome');
export const FontAwesome5 = createIconComponent('FontAwesome5');
export const Feather = createIconComponent('Feather');
export const AntDesign = createIconComponent('AntDesign');
export const Entypo = createIconComponent('Entypo');
export const EvilIcons = createIconComponent('EvilIcons');
export const Foundation = createIconComponent('Foundation');
export const Octicons = createIconComponent('Octicons');
export const SimpleLineIcons = createIconComponent('SimpleLineIcons');
export const Zocial = createIconComponent('Zocial');

export default {
  MaterialCommunityIcons, MaterialIcons, Ionicons, FontAwesome, FontAwesome5,
  Feather, AntDesign, Entypo, EvilIcons, Foundation, Octicons, SimpleLineIcons, Zocial
};
`;

/**
 * Builds a map of shimmed node_modules file entries for Sandpack.
 */
export function getShimFiles(): Record<string, string> {
  return {
    "/node_modules/expo-haptics/index.js": expoHapticsShim,
    "/node_modules/expo-haptics/package.json": pkg("expo-haptics"),

    "/node_modules/expo-blur/index.js": expoBlurShim,
    "/node_modules/expo-blur/package.json": pkg("expo-blur"),

    "/node_modules/react-native-reanimated/index.js": reanimatedShim,
    "/node_modules/react-native-reanimated/package.json": pkg("react-native-reanimated"),

    "/node_modules/expo-image/index.js": expoImageShim,
    "/node_modules/expo-image/package.json": pkg("expo-image"),

    "/node_modules/expo-status-bar/index.js": expoStatusBarShim,
    "/node_modules/expo-status-bar/package.json": pkg("expo-status-bar"),

    "/node_modules/expo-linear-gradient/index.js": expoLinearGradientShim,
    "/node_modules/expo-linear-gradient/package.json": pkg("expo-linear-gradient"),

    "/node_modules/expo-font/index.js": expoFontShim,
    "/node_modules/expo-font/package.json": pkg("expo-font"),

    "/node_modules/react-native-safe-area-context/index.js": safeAreaContextShim,
    "/node_modules/react-native-safe-area-context/package.json": pkg("react-native-safe-area-context"),

    "/node_modules/@react-navigation/native/index.js": reactNavigationNativeShim,
    "/node_modules/@react-navigation/native/package.json": pkg("@react-navigation/native"),

    "/node_modules/react-native-gesture-handler/index.js": gestureHandlerShim,
    "/node_modules/react-native-gesture-handler/package.json": pkg("react-native-gesture-handler"),

    "/node_modules/react-native-paper/index.js": reactNativePaperShim,
    "/node_modules/react-native-paper/package.json": pkg("react-native-paper"),

    "/node_modules/@expo/vector-icons/index.js": expoVectorIconsShim,
    "/node_modules/@expo/vector-icons/package.json": pkg("@expo/vector-icons"),
  };
}

function pkg(name: string): string {
  return JSON.stringify({ name, version: "1.0.0", main: "./index.js" });
}
