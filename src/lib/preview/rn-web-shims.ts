/**
 * Shim code for React Native modules that don't have web equivalents.
 * These are registered in the inline module system so that
 * imports resolve without errors in the self-hosted preview.
 */

/**
 * react-native -> lightweight HTML-based shim.
 * Renders RN components as plain HTML elements so that `className` (NativeWind/Tailwind)
 * props work natively with the Tailwind CDN loaded in index.html.
 * Replaces react-native-web entirely for the Sandpack preview.
 */
export const reactNativeShim = `
import React from 'react';

/* ── helpers ── */
function flat(s) {
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign.apply(null, [{}].concat(s.map(flat)));
  return typeof s === 'object' ? s : {};
}

var _pxProps = {width:1,height:1,minWidth:1,minHeight:1,maxWidth:1,maxHeight:1,
  top:1,right:1,bottom:1,left:1,margin:1,marginTop:1,marginRight:1,marginBottom:1,marginLeft:1,
  padding:1,paddingTop:1,paddingRight:1,paddingBottom:1,paddingLeft:1,
  borderRadius:1,borderTopLeftRadius:1,borderTopRightRadius:1,borderBottomLeftRadius:1,borderBottomRightRadius:1,
  borderWidth:1,borderTopWidth:1,borderRightWidth:1,borderBottomWidth:1,borderLeftWidth:1,
  fontSize:1,lineHeight:1,letterSpacing:1,gap:1,rowGap:1,columnGap:1};

function norm(s) {
  var f = flat(s);
  var o = {};
  for (var k in f) {
    if (f[k] == null) continue;
    var v = f[k];
    if (k === 'flex' && typeof v === 'number') {
      o.flex = v <= 0 ? '0 0 auto' : v + ' 1 0%';
      continue;
    }
    if (k === 'marginHorizontal') { var px = typeof v === 'number' ? v + 'px' : v; o.marginLeft = px; o.marginRight = px; continue; }
    if (k === 'marginVertical') { var px = typeof v === 'number' ? v + 'px' : v; o.marginTop = px; o.marginBottom = px; continue; }
    if (k === 'paddingHorizontal') { var px = typeof v === 'number' ? v + 'px' : v; o.paddingLeft = px; o.paddingRight = px; continue; }
    if (k === 'paddingVertical') { var px = typeof v === 'number' ? v + 'px' : v; o.paddingTop = px; o.paddingBottom = px; continue; }
    if (k === 'elevation' && typeof v === 'number') {
      var blur = Math.max(v, 1); var spread = Math.round(v * 0.3); var alpha = Math.min(0.1 + v * 0.03, 0.35).toFixed(2);
      o.boxShadow = '0 ' + Math.round(v * 0.5) + 'px ' + blur + 'px ' + spread + 'px rgba(0,0,0,' + alpha + ')';
      continue;
    }
    if (typeof v === 'number' && _pxProps[k]) { o[k] = v + 'px'; continue; }
    o[k] = v;
  }
  return o;
}

/* strip RN-only props so React doesn't warn */
var rnOnly = ['onLayout','hitSlop','collapsable','needsOffscreenAlphaCompositing',
  'removeClippedSubviews','renderToHardwareTextureAndroid','shouldRasterizeIOS',
  'accessibilityRole','accessibilityState','accessibilityLabel','importantForAccessibility',
  'accessibilityHint','accessibilityValue','accessibilityActions','onAccessibilityAction',
  'accessibilityLiveRegion','accessibilityElementsHidden','testID','nativeID',
  'pointerEvents','focusable','hasTVPreferredFocus'];
function clean(p) {
  var o = {};
  for (var k in p) { if (rnOnly.indexOf(k) === -1) o[k] = p[k]; }
  return o;
}

/* ── View ── */
export var View = React.forwardRef(function View(props, ref) {
  var s = props.style, cn = props.className, ch = props.children;
  var rest = clean(props);
  delete rest.style; delete rest.className; delete rest.children;
  return React.createElement('div', Object.assign({ ref: ref,
    className: '__rnView' + (cn ? ' ' + cn : ''),
    style: norm(s) || undefined
  }, rest), ch);
});

/* ── Text ── */
export var Text = React.forwardRef(function Text(props, ref) {
  var s = props.style, cn = props.className, ch = props.children, nl = props.numberOfLines;
  var rest = clean(props);
  delete rest.style; delete rest.className; delete rest.children;
  delete rest.numberOfLines; delete rest.ellipsizeMode; delete rest.allowFontScaling;
  var lc = nl ? { overflow:'hidden', display:'-webkit-box', WebkitLineClamp:nl, WebkitBoxOrient:'vertical' } : {};
  var st = Object.assign(lc, norm(s));
  return React.createElement('span', Object.assign({ ref: ref,
    className: '__rnText' + (cn ? ' ' + cn : ''),
    style: Object.keys(st).length ? st : undefined
  }, rest), ch);
});

/* ── ScrollView ── */
export var ScrollView = React.forwardRef(function ScrollView(props, ref) {
  var s = props.style, cn = props.className, ch = props.children, hz = props.horizontal, ccs = props.contentContainerStyle;
  var rest = clean(props);
  delete rest.style; delete rest.className; delete rest.children; delete rest.horizontal;
  delete rest.contentContainerStyle; delete rest.showsVerticalScrollIndicator;
  delete rest.showsHorizontalScrollIndicator; delete rest.scrollEventThrottle;
  delete rest.bounces; delete rest.keyboardShouldPersistTaps; delete rest.keyboardDismissMode;
  delete rest.onScroll; delete rest.nestedScrollEnabled; delete rest.stickyHeaderIndices;
  delete rest.decelerationRate; delete rest.scrollIndicatorInsets; delete rest.indicatorStyle;
  delete rest.snapToInterval; delete rest.snapToAlignment; delete rest.snapToOffsets;
  delete rest.snapToStart; delete rest.snapToEnd; delete rest.pagingEnabled;
  delete rest.alwaysBounceVertical; delete rest.alwaysBounceHorizontal;
  delete rest.automaticallyAdjustContentInsets; delete rest.directionalLockEnabled;
  delete rest.endFillColor; delete rest.overScrollMode; delete rest.scrollPerfTag;
  delete rest.contentInset; delete rest.contentOffset; delete rest.refreshControl;
  delete rest.invertStickyHeaders; delete rest.centerContent;
  var scrollCls = hz ? '__rnScroll __rnScrollH' : '__rnScroll';
  return React.createElement('div', Object.assign({ ref: ref,
    className: scrollCls + (cn ? ' ' + cn : ''),
    style: norm(s) || undefined
  }, rest),
    React.createElement('div', { style: Object.assign({ display:'flex',
      flexDirection: hz ? 'row' : 'column' }, norm(ccs)) }, ch));
});

/* ── Image ── */
export var Image = React.forwardRef(function Img(props, ref) {
  var source = props.source, s = props.style, cn = props.className, rm = props.resizeMode;
  var rest = clean(props);
  delete rest.source; delete rest.style; delete rest.className; delete rest.resizeMode;
  delete rest.defaultSource; delete rest.blurRadius; delete rest.fadeDuration;
  var src = '';
  if (typeof source === 'string') src = source;
  else if (source && source.uri) src = source.uri;
  var fit = rm === 'contain' ? 'contain' : rm === 'stretch' ? 'fill' : rm === 'center' ? 'none' : 'cover';
  return React.createElement('img', Object.assign({ ref: ref, className: cn, src: src,
    style: Object.assign({ objectFit: fit }, norm(s)),
    onError: function(e) {
      var t = e.target;
      t.style.backgroundColor = '#f0f0f0';
      t.style.objectFit = 'contain';
      t.alt = '';
      t.removeAttribute('src');
      t.style.display = 'flex';
      t.style.alignItems = 'center';
      t.style.justifyContent = 'center';
      t.style.border = '1px dashed #ddd';
    }
  }, rest));
});

/* ── Touchables / Pressable ── */
export function TouchableOpacity(props) {
  var onPress = props.onPress, s = props.style, cn = props.className, ch = props.children, d = props.disabled;
  var extra = d ? { cursor:'default', opacity:0.5 } : {};
  return React.createElement('div', {
    className: '__rnTouchable' + (cn ? ' ' + cn : ''),
    onClick: d ? undefined : onPress,
    style: Object.assign(extra, norm(s)) || undefined
  }, ch);
}
export function TouchableHighlight(props) { return TouchableOpacity(props); }
export function TouchableWithoutFeedback(props) {
  return React.createElement('div', { onClick: props.disabled ? undefined : props.onPress }, props.children);
}
export function Pressable(props) {
  var onPress = props.onPress, d = props.disabled, ch = props.children, cn = props.className;
  var s = typeof props.style === 'function' ? props.style({ pressed: false }) : props.style;
  var c = typeof cn === 'function' ? cn({ pressed: false }) : cn;
  var extra = d ? { cursor:'default' } : {};
  return React.createElement('div', {
    className: '__rnPressable' + (c ? ' ' + c : ''),
    onClick: d ? undefined : onPress,
    style: Object.assign(extra, norm(s)) || undefined
  }, typeof ch === 'function' ? ch({ pressed: false }) : ch);
}

/* ── TextInput ── */
export function TextInput(props) {
  var v = props.value, oct = props.onChangeText, ph = props.placeholder, s = props.style;
  var cn = props.className, ml = props.multiline, sec = props.secureTextEntry;
  var tag = ml ? 'textarea' : 'input';
  return React.createElement(tag, {
    className: '__rnInput' + (cn ? ' ' + cn : ''),
    value: v,
    onChange: function(e) { oct && oct(e.target.value); },
    placeholder: ph, type: sec ? 'password' : 'text',
    rows: ml ? (props.numberOfLines || 4) : undefined,
    readOnly: props.editable === false,
    style: norm(s) || undefined
  });
}

/* ── FlatList ── */
export function FlatList(props) {
  var data = props.data || [], ri = props.renderItem, ke = props.keyExtractor;
  var s = props.style, cn = props.className, ccs = props.contentContainerStyle, hz = props.horizontal;
  var H = props.ListHeaderComponent, F = props.ListFooterComponent, E = props.ListEmptyComponent;
  var nc = props.numColumns;
  var header = H ? (typeof H === 'function' ? React.createElement(H) : H) : null;
  var footer = F ? (typeof F === 'function' ? React.createElement(F) : F) : null;
  var empty = data.length === 0 && E ? (typeof E === 'function' ? React.createElement(E) : E) : null;
  var scrollCls = hz ? '__rnScroll __rnScrollH' : '__rnScroll';
  return React.createElement('div', {
    className: scrollCls + (cn ? ' ' + cn : ''),
    style: norm(s) || undefined
  }, header, empty || React.createElement('div', {
    style: Object.assign({ display:'flex', flexDirection: hz ? 'row' : 'column',
      flexWrap: nc > 1 ? 'wrap' : 'nowrap' }, norm(ccs))
  }, data.map(function(item, i) {
    var key = ke ? ke(item, i) : (item.id != null ? String(item.id) : item.key != null ? String(item.key) : String(i));
    return React.createElement(React.Fragment, { key: key }, ri({ item: item, index: i }));
  })), footer);
}

/* ── SectionList ── */
export function SectionList(props) {
  var secs = props.sections || [], ri = props.renderItem, rsh = props.renderSectionHeader;
  return React.createElement('div', {
    className: '__rnScroll' + (props.className ? ' ' + props.className : ''),
    style: norm(props.style) || undefined
  }, secs.map(function(sec, si) {
    return React.createElement(React.Fragment, { key: sec.title || si },
      rsh ? rsh({ section: sec }) : null,
      (sec.data || []).map(function(item, ii) {
        return React.createElement(React.Fragment, { key: item.id || ii }, ri({ item: item, index: ii, section: sec }));
      })
    );
  }));
}

/* ── Modal ── */
export function Modal(props) {
  if (!props.visible) return null;
  return React.createElement('div', {
    style: { position:'fixed', top:0, left:0, right:0, bottom:0,
      backgroundColor: props.transparent ? 'transparent' : '#fff',
      zIndex:1000, display:'flex', flexDirection:'column' },
    onClick: function(e) { if (e.target === e.currentTarget && props.onRequestClose) props.onRequestClose(); }
  }, props.children);
}

/* ── Switch ── */
export function Switch(props) {
  return React.createElement('input', { type:'checkbox', checked:!!props.value,
    onChange: function(e) { props.onValueChange && props.onValueChange(e.target.checked); },
    disabled: props.disabled,
    style: { width:44, height:24, accentColor: (props.trackColor && props.trackColor.true) || '#3b82f6', cursor:'pointer' }
  });
}

/* ── ActivityIndicator ── */
export function ActivityIndicator(props) {
  var sz = props.size === 'large' ? 36 : props.size === 'small' ? 20 : (typeof props.size === 'number' ? props.size : 20);
  return React.createElement('div', {
    style: Object.assign({ width:sz, height:sz, border:'3px solid #e0e0e0',
      borderTopColor: props.color || '#3b82f6', borderRadius:'50%',
      animation:'__rn_spin 0.8s linear infinite' }, norm(props.style))
  });
}

/* ── StatusBar / SafeAreaView / KeyboardAvoidingView ── */
export function StatusBar() { return null; }
export var SafeAreaView = View;
export var KeyboardAvoidingView = View;

/* ── StyleSheet ── */
export var StyleSheet = {
  create: function(s) { return s; },
  flatten: flat,
  hairlineWidth: 1,
  absoluteFill: { position:'absolute', top:0, left:0, right:0, bottom:0 },
  absoluteFillObject: { position:'absolute', top:0, left:0, right:0, bottom:0 },
  compose: function(a, b) { return [a, b]; },
};

/* ── Platform ── */
export var Platform = {
  OS: 'web', Version: 0, isTV: false,
  select: function(o) { return o.web !== undefined ? o.web : o.default; },
};

/* ── Dimensions ── */
export var Dimensions = {
  get: function() { return { width: window.innerWidth, height: window.innerHeight, scale:1, fontScale:1 }; },
  addEventListener: function() { return { remove: function(){} }; },
  removeEventListener: function() {},
};

/* ── AppRegistry ── */
export var AppRegistry = {
  _r: {},
  registerComponent: function(n, g) { AppRegistry._r[n] = g; },
  runApplication: function(n, opts) {
    var C = AppRegistry._r[n]; if (!C) return; C = C();
    var root = typeof opts.rootTag === 'string' ? document.querySelector(opts.rootTag) : opts.rootTag;
    if (!root) root = document.getElementById('root');
    try { var RDC = require('react-dom/client'); RDC.createRoot(root).render(React.createElement(C)); }
    catch(e) { var RD = require('react-dom'); RD.render(React.createElement(C), root); }
  }
};

/* ── Animated (basic no-op wrapper) ── */
function AV(val) { this._val = val; }
AV.prototype.setValue = function(v) { this._val = v; };
AV.prototype.interpolate = function(cfg) { return new AV(0); };
AV.prototype.addListener = function() { return { remove: function(){} }; };
AV.prototype.removeAllListeners = function() {};
AV.prototype.stopAnimation = function(cb) { cb && cb(this._val); };
var noop_anim = { start: function(cb) { cb && cb({ finished:true }); }, stop: function() {}, reset: function() {} };
export var Animated = {
  View: View, Text: Text, Image: Image, ScrollView: ScrollView, FlatList: FlatList,
  createAnimatedComponent: function(c) { return c; },
  Value: AV,
  ValueXY: function(v) { this.x = new AV(v ? v.x : 0); this.y = new AV(v ? v.y : 0); },
  timing: function() { return noop_anim; },
  spring: function() { return noop_anim; },
  decay: function() { return noop_anim; },
  parallel: function() { return noop_anim; },
  sequence: function() { return noop_anim; },
  stagger: function() { return noop_anim; },
  loop: function() { return noop_anim; },
  event: function() { return function(){}; },
  add: function() { return new AV(0); },
  subtract: function() { return new AV(0); },
  multiply: function() { return new AV(0); },
  divide: function() { return new AV(0); },
  modulo: function() { return new AV(0); },
  diffClamp: function() { return new AV(0); },
};

/* ── Easing ── */
export var Easing = {
  linear: function(t){return t;}, ease: function(t){return t;},
  quad: function(t){return t*t;}, cubic: function(t){return t*t*t;},
  bezier: function(){return function(t){return t;};},
  in: function(e){return e;}, out: function(e){return e;}, inOut: function(e){return e;},
  circle: function(t){return t;}, sin: function(t){return t;}, exp: function(t){return t;},
  bounce: function(t){return t;}, back: function(){return function(t){return t;};},
  elastic: function(){return function(t){return t;};},
};

/* ── Misc utilities ── */
export var PixelRatio = {
  get: function() { return window.devicePixelRatio || 1; },
  getFontScale: function() { return 1; },
  getPixelSizeForLayoutSize: function(s) { return s * (window.devicePixelRatio || 1); },
  roundToNearestPixel: function(s) { var r = window.devicePixelRatio || 1; return Math.round(s*r)/r; },
};
export var Alert = { alert: function(t,m) { console.log('[Alert]', t, m); } };
export var Linking = {
  openURL: function(u) { window.open(u,'_blank'); return Promise.resolve(); },
  canOpenURL: function() { return Promise.resolve(true); },
  getInitialURL: function() { return Promise.resolve(null); },
  addEventListener: function() { return { remove: function(){} }; },
};
export var Keyboard = {
  dismiss: function() {}, addListener: function() { return { remove: function(){} }; },
  removeListener: function() {},
};
export var Share = { share: function() { return Promise.resolve({ action:'dismissedAction' }); } };
export function useWindowDimensions() {
  return { width: window.innerWidth, height: window.innerHeight, scale:1, fontScale:1 };
}
export function useColorScheme() { return 'light'; }
export var I18nManager = { isRTL: false, allowRTL: function(){}, forceRTL: function(){} };
export var Appearance = {
  getColorScheme: function() { return 'light'; },
  addChangeListener: function() { return { remove: function(){} }; },
};
export var BackHandler = {
  addEventListener: function() { return { remove: function(){} }; },
  exitApp: function() {},
};
export var Clipboard = {
  getString: function() { return Promise.resolve(''); },
  setString: function() {},
};
export var Vibration = { vibrate: function(){}, cancel: function(){} };
export var LayoutAnimation = {
  configureNext: function(){},
  create: function(){ return {}; },
  Types: { spring:0, linear:1, easeInEaseOut:2, easeIn:3, easeOut:4 },
  Properties: { opacity:0, scaleX:1, scaleY:2, scaleXY:3 },
  Presets: { easeInEaseOut:{}, linear:{}, spring:{} },
};
`;

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
import React from 'react';
import { View, Text, Image, ScrollView, FlatList } from 'react-native';

export function useSharedValue(init) {
  const ref = React.useRef(init);
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
export var Easing = { linear: function(t){return t;}, ease: function(t){return t;}, bezier: function(){return function(t){return t;};}, in: function(e){return e;}, out: function(e){return e;}, inOut: function(e){return e;} };
export var ReduceMotion = { System: 0, Always: 1, Never: 2 };

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

var createAnimatedComponent = function(Comp) {
  var W = React.forwardRef(function(props, ref) { return React.createElement(Comp, Object.assign({}, props, { ref: ref })); });
  W.displayName = 'Animated.' + (Comp.displayName || Comp.name || 'Component');
  return W;
};

function AV(val) { this._val = val; }
AV.prototype.setValue = function(v) { this._val = v; };
AV.prototype.interpolate = function() { return new AV(0); };
AV.prototype.addListener = function() { return { remove: function(){} }; };
AV.prototype.removeAllListeners = function() {};
AV.prototype.stopAnimation = function(cb) { cb && cb(this._val); };
var noop_anim = { start: function(cb) { cb && cb({ finished:true }); }, stop: function() {}, reset: function() {} };

var ReanimatedDefault = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  FlatList: createAnimatedComponent(FlatList),
  createAnimatedComponent: createAnimatedComponent,
  Value: AV,
  ValueXY: function(v) { this.x = new AV(v ? v.x : 0); this.y = new AV(v ? v.y : 0); },
  timing: function() { return noop_anim; },
  spring: function() { return noop_anim; },
  decay: function() { return noop_anim; },
  parallel: function() { return noop_anim; },
  sequence: function() { return noop_anim; },
  stagger: function() { return noop_anim; },
  loop: function() { return noop_anim; },
  event: function() { return function(){}; },
  add: function() { return new AV(0); },
  subtract: function() { return new AV(0); },
  multiply: function() { return new AV(0); },
  divide: function() { return new AV(0); },
  diffClamp: function() { return new AV(0); },
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
    // AI-generated code often uses these non-MD3 font names
    heading: { fontFamily: 'System', fontSize: 24, fontWeight: '700' },
    subheading: { fontFamily: 'System', fontSize: 18, fontWeight: '600' },
    body: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
    caption: { fontFamily: 'System', fontSize: 12, fontWeight: '400' },
    regular: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
    medium: { fontFamily: 'System', fontSize: 14, fontWeight: '500' },
    bold: { fontFamily: 'System', fontSize: 14, fontWeight: '700' },
    light: { fontFamily: 'System', fontSize: 14, fontWeight: '300' },
    thin: { fontFamily: 'System', fontSize: 14, fontWeight: '100' },
  },
  animation: { scale: 1.0 },
};

const ThemeContext = React.createContext(defaultTheme);

export function PaperProvider({ theme, children }) {
  return React.createElement(ThemeContext.Provider, { value: theme || defaultTheme }, children);
}
export const Provider = PaperProvider;
export const DefaultTheme = defaultTheme;
export const MD3LightTheme = defaultTheme;
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
Card.Cover = function CardCover({ source, style }) {
  var src = '';
  if (source && source.uri) src = source.uri;
  else if (typeof source === 'string') src = source;
  if (src) {
    return React.createElement('img', {
      src: src,
      style: Object.assign({ width: '100%', height: 200, objectFit: 'cover', display: 'block' }, flat(style)),
      onError: function(e) { e.target.style.backgroundColor = '#e0e0e0'; e.target.src = ''; }
    });
  }
  return React.createElement(View, { style: [{ height: 200, backgroundColor: '#e0e0e0' }, style] });
};
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
  var src = '';
  if (source && source.uri) src = source.uri;
  else if (typeof source === 'string') src = source;
  if (src) {
    return React.createElement('img', {
      src: src,
      style: Object.assign({ width: s, height: s, borderRadius: s/2, objectFit: 'cover', backgroundColor: '#e0e0e0' }, flat(style)),
      onError: function(e) { e.target.style.display = 'none'; }
    });
  }
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

export function configureFonts(config) {
  var base = defaultTheme.fonts;
  if (!config) return base;
  var custom = config.config || config || {};
  var result = {};
  for (var k in base) { result[k] = Object.assign({}, base[k], custom[k] || custom.default || {}); }
  // Apply top-level fontFamily to all variants
  if (custom.fontFamily) {
    for (var k in result) { result[k] = Object.assign({}, result[k], { fontFamily: custom.fontFamily }); }
  }
  // Merge any custom named entries not in base (regular, medium, bold, heading, body, etc.)
  for (var k in custom) {
    if (k !== 'fontFamily' && typeof custom[k] === 'object' && !result[k]) {
      result[k] = Object.assign({ fontFamily: 'System', fontSize: 14, fontWeight: '400' }, custom[k]);
    }
  }
  return result;
}

export function withTheme(Component) {
  return function ThemedComponent(props) {
    var theme = React.useContext(ThemeContext) || defaultTheme;
    return React.createElement(Component, Object.assign({}, props, { theme: theme }));
  };
}
`;

/** @expo/vector-icons -> codepoint-based rendering with native TTF fonts */
export const expoVectorIconsShim = `
import React from 'react';

// ── Glyphmap cache: font family name → { iconName: codepoint } ──
// Loaded from CDN on first use, cached globally.
var _glyphmaps = {};
var _glyphmapPromises = {};
var _glyphmapVersion = 0; // bumped on every successful load to trigger re-render

var _CDN_BASE = 'https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/glyphmaps/';

// Map of icon set display names to their glyphmap JSON filenames on CDN
var _glyphmapFiles = {
  'MaterialCommunityIcons': 'MaterialCommunityIcons.json',
  'MaterialIcons': 'MaterialIcons.json',
  'Ionicons': 'Ionicons.json',
  'FontAwesome': 'FontAwesome.json',
  'Feather': 'Feather.json',
  'AntDesign': 'AntDesign.json',
  'Entypo': 'Entypo.json',
  'EvilIcons': 'EvilIcons.json',
  'Foundation': 'Foundation.json',
  'Octicons': 'Octicons.json',
  'SimpleLineIcons': 'SimpleLineIcons.json',
  'Zocial': 'Zocial.json',
};

function _loadGlyphmap(fontFamily) {
  if (_glyphmaps[fontFamily]) return Promise.resolve(_glyphmaps[fontFamily]);
  if (_glyphmapPromises[fontFamily]) return _glyphmapPromises[fontFamily];
  var file = _glyphmapFiles[fontFamily];
  if (!file) return Promise.resolve(null);
  _glyphmapPromises[fontFamily] = fetch(_CDN_BASE + file)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _glyphmaps[fontFamily] = data;
      _glyphmapVersion++;
      return data;
    })
    .catch(function() { return null; });
  return _glyphmapPromises[fontFamily];
}

// Fallback: Google Material Icons ligature map for instant rendering
// while native glyphmaps load from CDN.
var _ligatureMap = {
  'home':'home','account':'person','account-outline':'person_outline',
  'account-circle':'account_circle','cog':'settings','bell':'notifications',
  'bell-outline':'notifications_none','heart':'favorite','heart-outline':'favorite_border',
  'star':'star','star-outline':'star_border','magnify':'search','plus':'add','close':'close',
  'arrow-left':'arrow_back','arrow-right':'arrow_forward','arrow-up':'arrow_upward',
  'arrow-down':'arrow_downward','chevron-left':'chevron_left','chevron-right':'chevron_right',
  'chevron-up':'expand_less','chevron-down':'expand_more','check':'check',
  'check-circle':'check_circle','delete':'delete','pencil':'edit','email':'email',
  'phone':'phone','camera':'photo_camera','image':'image','cart':'shopping_cart',
  'bookmark':'bookmark','bookmark-outline':'bookmark_border','calendar':'calendar_today',
  'clock':'schedule','download':'download','upload':'upload','share-variant':'share',
  'send':'send','filter':'filter_list','menu':'menu','information':'info',
  'help-circle':'help','map-marker':'location_on','lock':'lock','lock-open':'lock_open',
  'logout':'logout','login':'login','refresh':'refresh','eye':'visibility',
  'eye-off':'visibility_off','thumb-up':'thumb_up','fire':'local_fire_department',
  'music':'music_note','play':'play_arrow','pause':'pause','stop':'stop',
  'video':'videocam','microphone':'mic','wifi':'wifi','flash':'flash_on','flag':'flag',
  'folder':'folder','file':'description','link':'link','tag':'label','alert':'warning',
  'alert-circle':'error','dots-vertical':'more_vert','dots-horizontal':'more_horiz',
  'plus-circle':'add_circle','minus':'remove','format-list-bulleted':'format_list_bulleted',
  'view-grid':'grid_view','cash':'payments','credit-card':'credit_card',
  'wallet':'account_balance_wallet','chart-line':'show_chart','chart-bar':'bar_chart',
  'trophy':'emoji_events','crown':'workspace_premium','message':'message','chat':'chat',
  'compass':'explore','earth':'public','web':'language','content-copy':'content_copy',
  'brush':'brush','food':'restaurant','coffee':'coffee','bike':'directions_bike',
  'car':'directions_car','airplane':'flight','bed':'bed','dumbbell':'fitness_center',
  'lightbulb':'lightbulb','battery':'battery_full','volume-high':'volume_up',
  'code-tags':'code','database':'storage','cloud':'cloud','shield':'shield',
  'key':'vpn_key','cellphone':'smartphone','laptop':'laptop','school':'school',
  'book':'menu_book','attachment':'attach_file','history':'history','sync':'sync',
  'gift':'card_giftcard',
  // Ionicons/Feather/FA common names
  'search':'search','person':'person','settings':'settings','notifications':'notifications',
  'add':'add','trash':'delete','mail':'email','call':'phone','location':'location_on',
  'globe':'public','copy':'content_copy','user':'person','x':'close',
  'shopping-cart':'shopping_cart','map-pin':'location_on','thumbs-up':'thumb_up',
  'sun':'wb_sunny','moon':'nights_stay','list':'format_list_bulleted',
  'envelope':'email','bars':'menu','eye-slash':'visibility_off',
};

// Known fallback codepoint: circle-outline (U+F0130 = 983344 decimal)
var _FALLBACK_CODEPOINT = 984934;

function createIconComponent(fontFamily) {
  // Start loading glyphmap immediately
  _loadGlyphmap(fontFamily);

  function IconComponent(props) {
    var name = props.name;
    var size = props.size || 24;
    var color = props.color || '#000';
    var pStyle = props.style;

    var glyph = _glyphmaps[fontFamily];
    var codepoint = glyph && glyph[name];

    // State for re-render after async glyphmap load
    var updateRef = React.useState(0);
    var forceUpdate = updateRef[1];

    React.useEffect(function() {
      if (!glyph) {
        _loadGlyphmap(fontFamily).then(function(data) {
          if (data) forceUpdate(function(n) { return n + 1; });
        });
      }
    }, [name, glyph]);

    // Re-read after potential async update
    glyph = _glyphmaps[fontFamily];
    codepoint = glyph && glyph[name];

    if (codepoint != null) {
      // Render using the native TTF font with unicode codepoint
      var char = String.fromCodePoint(codepoint);
      return React.createElement('span', {
        style: Object.assign({
          fontFamily: fontFamily,
          fontSize: size,
          color: color,
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: 1,
          display: 'inline-block',
          WebkitFontSmoothing: 'antialiased',
        }, Array.isArray(pStyle) ? Object.assign.apply(null, [{}].concat(pStyle)) : (pStyle || {})),
      }, char);
    }

    // Fallback: try Google Material Icons ligature map
    var ligature = _ligatureMap[name];
    if (ligature) {
      return React.createElement('span', {
        style: Object.assign({
          fontFamily: 'Material Icons',
          fontSize: size,
          color: color,
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: 1,
          letterSpacing: 'normal',
          textTransform: 'none',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          direction: 'ltr',
          WebkitFontSmoothing: 'antialiased',
          fontFeatureSettings: '"liga"',
        }, Array.isArray(pStyle) ? Object.assign.apply(null, [{}].concat(pStyle)) : (pStyle || {})),
      }, ligature);
    }

    // Last resort: render fallback icon (circle-outline) using MDI font if available,
    // otherwise render a simple dot placeholder
    var mdiFallback = _glyphmaps['MaterialCommunityIcons'];
    var fallbackCode = mdiFallback && mdiFallback['circle-outline'];
    if (fallbackCode != null) {
      return React.createElement('span', {
        'title': name,
        style: Object.assign({
          fontFamily: 'MaterialCommunityIcons',
          fontSize: size,
          color: color,
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: 1,
          display: 'inline-block',
          opacity: 0.5,
          WebkitFontSmoothing: 'antialiased',
        }, Array.isArray(pStyle) ? Object.assign.apply(null, [{}].concat(pStyle)) : (pStyle || {})),
      }, String.fromCodePoint(fallbackCode));
    }

    // Absolute last resort: CSS circle placeholder
    return React.createElement('span', {
      'title': name,
      style: Object.assign({
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid ' + color,
        boxSizing: 'border-box',
        opacity: 0.4,
      }, Array.isArray(pStyle) ? Object.assign.apply(null, [{}].concat(pStyle)) : (pStyle || {})),
    });
  }
  IconComponent.displayName = fontFamily;
  return IconComponent;
}

export const MaterialCommunityIcons = createIconComponent('MaterialCommunityIcons');
export const MaterialIcons = createIconComponent('MaterialIcons');
export const Ionicons = createIconComponent('Ionicons');
export const FontAwesome = createIconComponent('FontAwesome');
export const FontAwesome5 = createIconComponent('FontAwesome');
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

/** @react-navigation/bottom-tabs -> no-op (navigation handled by App.tsx) */
export const reactNavigationBottomTabsShim = `
import React from 'react';
import { View } from 'react-native';

export function createBottomTabNavigator() {
  function Navigator({ children, screenOptions, tabBar }) {
    // Render all Screen children - only show the first one
    var screens = React.Children.toArray(children);
    if (screens.length === 0) return null;
    var first = screens[0];
    var Comp = first && first.props && first.props.component;
    if (Comp) return React.createElement(Comp, { navigation: { navigate: function(){}, goBack: function(){} }, route: { params: {} } });
    return React.createElement(View, { style: { flex: 1 } }, children);
  }
  function Screen() { return null; }
  return { Navigator: Navigator, Screen: Screen };
}
export default { createBottomTabNavigator: createBottomTabNavigator };
`;

/** @react-navigation/native-stack -> no-op */
export const reactNavigationNativeStackShim = `
import React from 'react';
import { View } from 'react-native';

export function createNativeStackNavigator() {
  function Navigator({ children }) {
    var screens = React.Children.toArray(children);
    if (screens.length === 0) return null;
    var first = screens[0];
    var Comp = first && first.props && first.props.component;
    if (Comp) return React.createElement(Comp, { navigation: { navigate: function(){}, goBack: function(){}, setOptions: function(){} }, route: { params: {} } });
    return React.createElement(View, { style: { flex: 1 } }, children);
  }
  function Screen() { return null; }
  return { Navigator: Navigator, Screen: Screen };
}
export default { createNativeStackNavigator: createNativeStackNavigator };
`;

/** expo-constants -> stub */
export const expoConstantsShim = `
var Constants = {
  expoConfig: {
    name: 'App',
    slug: 'app',
    version: '1.0.0',
    extra: {},
  },
  manifest: null,
  manifest2: null,
  expoGoConfig: null,
  easConfig: null,
  appOwnership: null,
  executionEnvironment: 'storeClient',
  installationId: 'preview',
  isDevice: true,
  platform: { ios: {}, android: {}, web: {} },
  sessionId: 'preview-session',
  statusBarHeight: 44,
  systemFonts: [],
  isHeadless: false,
};
export default Constants;
export { Constants };
`;

/** react-native-svg -> SVG element wrappers */
export const reactNativeSvgShim = `
import React from 'react';

function svgEl(tag) {
  return React.forwardRef(function(props, ref) {
    var cleaned = {};
    for (var k in props) {
      if (k === 'children') continue;
      // Convert camelCase to kebab-case for SVG attributes
      var key = k;
      if (k === 'strokeWidth') key = 'strokeWidth';
      else if (k === 'strokeLinecap') key = 'strokeLinecap';
      else if (k === 'strokeLinejoin') key = 'strokeLinejoin';
      else if (k === 'fillRule') key = 'fillRule';
      else if (k === 'clipRule') key = 'clipRule';
      else if (k === 'viewBox') key = 'viewBox';
      cleaned[key] = props[k];
    }
    cleaned.ref = ref;
    return React.createElement(tag, cleaned, props.children);
  });
}

export var Svg = React.forwardRef(function(props, ref) {
  var width = props.width, height = props.height, viewBox = props.viewBox;
  var style = props.style || {};
  return React.createElement('svg', {
    ref: ref,
    width: width,
    height: height,
    viewBox: viewBox || ('0 0 ' + (width || 24) + ' ' + (height || 24)),
    xmlns: 'http://www.w3.org/2000/svg',
    style: typeof style === 'object' ? style : {},
    fill: props.fill,
    stroke: props.stroke,
  }, props.children);
});
Svg.displayName = 'Svg';

export var Circle = svgEl('circle');
export var Rect = svgEl('rect');
export var Path = svgEl('path');
export var Line = svgEl('line');
export var Polyline = svgEl('polyline');
export var Polygon = svgEl('polygon');
export var Ellipse = svgEl('ellipse');
export var Text = svgEl('text');
export var TSpan = svgEl('tspan');
export var G = svgEl('g');
export var Defs = svgEl('defs');
export var LinearGradient = svgEl('linearGradient');
export var RadialGradient = svgEl('radialGradient');
export var Stop = svgEl('stop');
export var ClipPath = svgEl('clipPath');
export var Mask = svgEl('mask');
export var Use = svgEl('use');
export var Symbol = svgEl('symbol');
export var Pattern = svgEl('pattern');
export var Image = svgEl('image');
export var ForeignObject = svgEl('foreignObject');

export default Svg;
`;

/** @react-native-async-storage/async-storage -> localStorage wrapper */
export const asyncStorageShim = `
var AsyncStorage = {
  getItem: function(key) {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch(e) { return Promise.resolve(null); }
  },
  setItem: function(key, value) {
    try { localStorage.setItem(key, value); return Promise.resolve(); }
    catch(e) { return Promise.resolve(); }
  },
  removeItem: function(key) {
    try { localStorage.removeItem(key); return Promise.resolve(); }
    catch(e) { return Promise.resolve(); }
  },
  clear: function() {
    try { localStorage.clear(); return Promise.resolve(); }
    catch(e) { return Promise.resolve(); }
  },
  getAllKeys: function() {
    try { return Promise.resolve(Object.keys(localStorage)); }
    catch(e) { return Promise.resolve([]); }
  },
  multiGet: function(keys) {
    try { return Promise.resolve(keys.map(function(k) { return [k, localStorage.getItem(k)]; })); }
    catch(e) { return Promise.resolve(keys.map(function(k) { return [k, null]; })); }
  },
  multiSet: function(pairs) {
    try { pairs.forEach(function(p) { localStorage.setItem(p[0], p[1]); }); return Promise.resolve(); }
    catch(e) { return Promise.resolve(); }
  },
  multiRemove: function(keys) {
    try { keys.forEach(function(k) { localStorage.removeItem(k); }); return Promise.resolve(); }
    catch(e) { return Promise.resolve(); }
  },
};
export default AsyncStorage;
`;

/** expo-router -> stub for multi-file generation */
export const expoRouterShim = `
import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';

var _routerInstance = {
  push: function(route) { console.log('[Router] push:', route); },
  replace: function(route) { console.log('[Router] replace:', route); },
  back: function() { console.log('[Router] back'); },
  canGoBack: function() { return false; },
  navigate: function(route) { console.log('[Router] navigate:', route); },
  setParams: function() {},
  dismiss: function() { console.log('[Router] dismiss'); },
  dismissAll: function() { console.log('[Router] dismissAll'); },
};
export var router = _routerInstance;
export function useRouter() {
  return _routerInstance;
}

export function useLocalSearchParams() { return {}; }
export function useGlobalSearchParams() { return {}; }
export function useSegments() { return []; }
export function usePathname() { return '/'; }
export function useRootNavigation() { return null; }
export function useRootNavigationState() { return { key: 'root', routes: [] }; }

export function Link({ href, children, asChild, style, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onPress: function() { console.log('[Router] Link:', href); } });
  }
  return React.createElement(TouchableOpacity, {
    onPress: function() { console.log('[Router] Link:', href); },
    style: style,
    ...props,
  }, typeof children === 'string' ? React.createElement(RNText, { style: { color: '#3b82f6' } }, children) : children);
}

export function Redirect() { return null; }
export function Stack({ children }) { return children || null; }
Stack.Screen = function StackScreen({ options }) { return null; };

export function Tabs({ children }) { return children || null; }
Tabs.Screen = function TabsScreen({ options }) { return null; };

export function Slot({ children }) { return children || null; }

export function SplashScreen() { return null; }
SplashScreen.preventAutoHideAsync = function() { return Promise.resolve(); };
SplashScreen.hideAsync = function() { return Promise.resolve(); };

export function ErrorBoundary({ children }) { return children; }

export default { useRouter, useLocalSearchParams, Link, Stack, Tabs, Slot, Redirect };
`;

/** expo-splash-screen -> no-op */
export const expoSplashScreenShim = `
export function preventAutoHideAsync() { return Promise.resolve(); }
export function hideAsync() { return Promise.resolve(); }
export function hide() {}
export default { preventAutoHideAsync, hideAsync, hide };
`;

/** lucide-react-native -> SVG icon components for web preview */
export const lucideReactNativeShim = `
import React from 'react';

// Generic icon component that renders a simple SVG placeholder
function createIcon(name, pathData) {
  var Icon = function(props) {
    var size = props.size || 24;
    var color = props.color || 'currentColor';
    var sw = props.strokeWidth || 1.5;
    var fill = props.fill || 'none';
    var style = props.style || {};
    return React.createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24',
      fill: fill === 'none' ? 'none' : fill,
      stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
      style: Object.assign({ display: 'inline-block', verticalAlign: 'middle' }, style),
    }, pathData ? React.createElement('path', { d: pathData }) : React.createElement('circle', { cx: 12, cy: 12, r: 6 }));
  };
  Icon.displayName = name;
  return Icon;
}

// Common icons with actual SVG paths
var icons = {
  Home: createIcon('Home', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
  Search: createIcon('Search', 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'),
  Heart: createIcon('Heart', 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'),
  Star: createIcon('Star', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  User: createIcon('User', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'),
  Settings: createIcon('Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'),
  Bell: createIcon('Bell', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0'),
  Plus: createIcon('Plus', 'M12 5v14M5 12h14'),
  X: createIcon('X', 'M18 6L6 18M6 6l12 12'),
  Check: createIcon('Check', 'M20 6L9 17l-5-5'),
  ChevronRight: createIcon('ChevronRight', 'M9 18l6-6-6-6'),
  ChevronLeft: createIcon('ChevronLeft', 'M15 18l-6-6 6-6'),
  ArrowLeft: createIcon('ArrowLeft', 'M19 12H5M12 19l-7-7 7-7'),
  ArrowRight: createIcon('ArrowRight', 'M5 12h14M12 5l7 7-7 7'),
  Mail: createIcon('Mail', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6'),
  Phone: createIcon('Phone', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72'),
  MapPin: createIcon('MapPin', 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'),
  Calendar: createIcon('Calendar', 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18'),
  Clock: createIcon('Clock', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2'),
  Camera: createIcon('Camera', 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'),
  ShoppingCart: createIcon('ShoppingCart', 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6'),
  Filter: createIcon('Filter', 'M22 3H2l8 9.46V19l4 2v-8.54L22 3'),
  Edit: createIcon('Edit', 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'),
  Trash2: createIcon('Trash2', 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
  Eye: createIcon('Eye', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'),
  EyeOff: createIcon('EyeOff', 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94'),
  Lock: createIcon('Lock', 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4'),
  Bookmark: createIcon('Bookmark', 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'),
  Share2: createIcon('Share2', 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98'),
  MessageCircle: createIcon('MessageCircle', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'),
  Send: createIcon('Send', 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'),
  Zap: createIcon('Zap', 'M13 2L3 14h9l-1 10 10-12h-9l1-10z'),
  Globe: createIcon('Globe', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20'),
  BarChart3: createIcon('BarChart3', 'M18 20V10M12 20V4M6 20v-6'),
  TrendingUp: createIcon('TrendingUp', 'M23 6l-9.5 9.5-5-5L1 18'),
  Wallet: createIcon('Wallet', 'M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4'),
  CreditCard: createIcon('CreditCard', 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22'),
  Package: createIcon('Package', 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'),
  Info: createIcon('Info', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01'),
  AlertCircle: createIcon('AlertCircle', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01'),
  CheckCircle: createIcon('CheckCircle', 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3'),
  RefreshCw: createIcon('RefreshCw', 'M23 4v6h-6M1 20v-6h6'),
  Download: createIcon('Download', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
  Upload: createIcon('Upload', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'),
  LogOut: createIcon('LogOut', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  Pencil: createIcon('Pencil', 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'),
  MoreHorizontal: createIcon('MoreHorizontal', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'),
  Menu: createIcon('Menu', 'M3 12h18M3 6h18M3 18h18'),
  Copy: createIcon('Copy', 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'),
  List: createIcon('List', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  Grid3X3: createIcon('Grid3X3', 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18'),
  Mic: createIcon('Mic', 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'),
  Play: createIcon('Play', 'M5 3l14 9-14 9V3z'),
  Pause: createIcon('Pause', 'M6 4h4v16H6zM14 4h4v16h-4z'),
  Music: createIcon('Music', 'M9 18V5l12-2v13'),
  Sun: createIcon('Sun', 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'),
  Moon: createIcon('Moon', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'),
  Award: createIcon('Award', 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12'),
  Trophy: createIcon('Trophy', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2z'),
  Flame: createIcon('Flame', 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'),
  Coffee: createIcon('Coffee', 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3'),
  Target: createIcon('Target', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'),
  Compass: createIcon('Compass', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'),
  ImageIcon: createIcon('ImageIcon', 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21'),
  ShoppingBag: createIcon('ShoppingBag', 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0'),
  DollarSign: createIcon('DollarSign', 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'),
  Users: createIcon('Users', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
};

// Create a Proxy so any icon name works (returns generic circle for unknown icons)
var fallbackIcon = createIcon('Icon', null);
var handler = {
  get: function(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return target;
    if (typeof prop === 'symbol') return undefined;
    return target[prop] || fallbackIcon;
  }
};
var mod = new Proxy(icons, handler);
export default mod;

// Named exports for common icons
export var Home = icons.Home;
export var Search = icons.Search;
export var Heart = icons.Heart;
export var Star = icons.Star;
export var User = icons.User;
export var Settings = icons.Settings;
export var Bell = icons.Bell;
export var Plus = icons.Plus;
export var X = icons.X;
export var Check = icons.Check;
export var ChevronRight = icons.ChevronRight;
export var ChevronLeft = icons.ChevronLeft;
export var ArrowLeft = icons.ArrowLeft;
export var ArrowRight = icons.ArrowRight;
export var Mail = icons.Mail;
export var Phone = icons.Phone;
export var MapPin = icons.MapPin;
export var Calendar = icons.Calendar;
export var Clock = icons.Clock;
export var Camera = icons.Camera;
export var ShoppingCart = icons.ShoppingCart;
export var Filter = icons.Filter;
export var Edit = icons.Edit;
export var Trash2 = icons.Trash2;
export var Eye = icons.Eye;
export var EyeOff = icons.EyeOff;
export var Lock = icons.Lock;
export var Bookmark = icons.Bookmark;
export var Share2 = icons.Share2;
export var MessageCircle = icons.MessageCircle;
export var Send = icons.Send;
export var Zap = icons.Zap;
export var Globe = icons.Globe;
export var BarChart3 = icons.BarChart3;
export var TrendingUp = icons.TrendingUp;
export var Wallet = icons.Wallet;
export var CreditCard = icons.CreditCard;
export var Package = icons.Package;
export var Info = icons.Info;
export var AlertCircle = icons.AlertCircle;
export var CheckCircle = icons.CheckCircle;
export var RefreshCw = icons.RefreshCw;
export var Download = icons.Download;
export var Upload = icons.Upload;
export var LogOut = icons.LogOut;
export var Pencil = icons.Pencil;
export var MoreHorizontal = icons.MoreHorizontal;
export var Menu = icons.Menu;
export var Copy = icons.Copy;
export var List = icons.List;
export var Grid3X3 = icons.Grid3X3;
export var Mic = icons.Mic;
export var Play = icons.Play;
export var Pause = icons.Pause;
export var Music = icons.Music;
export var Sun = icons.Sun;
export var Moon = icons.Moon;
export var Award = icons.Award;
export var Trophy = icons.Trophy;
export var Flame = icons.Flame;
export var Coffee = icons.Coffee;
export var Target = icons.Target;
export var Compass = icons.Compass;
export var ImageIcon = icons.ImageIcon;
export var ShoppingBag = icons.ShoppingBag;
export var DollarSign = icons.DollarSign;
export var Users = icons.Users;
`;

/** @/constants/colors -> default Rork-style color palette (overridden by generated code) */
export const constantsColorsShim = `
var _flat = {
  background: '#FAFAF8', surface: '#F0EDE8', card: '#FFFFFF',
  cardOverlay: 'rgba(255, 255, 255, 0.65)',
  primary: '#0D0D0D', secondary: '#6B6B6B', tertiary: '#A3A3A3',
  accent: '#C8A97E', accentLight: '#E8DCC8', gold: '#B8964E',
  divider: '#E8E5E0', white: '#FFFFFF', black: '#0D0D0D',
  error: '#C44D4D', overlay: 'rgba(0, 0, 0, 0.4)',
  tabBar: '#FAFAF8', tabBarBorder: '#E8E5E0', tabInactive: '#C0BFBB', tabActive: '#0D0D0D',
  text: '#0D0D0D', border: '#E8E5E0', notification: '#C44D4D',
  icon: '#6B6B6B', tint: '#C8A97E',
};
// Support both flat (Colors.background) and legacy nested (Colors.light.background, Colors[scheme])
var Colors = Object.assign({}, _flat, {
  light: Object.assign({}, _flat),
  dark: {
    background: '#0D0D0D', surface: '#1A1A1A', card: '#262626',
    cardOverlay: 'rgba(0, 0, 0, 0.65)',
    primary: '#FAFAF8', secondary: '#A3A3A3', tertiary: '#6B6B6B',
    accent: '#C8A97E', accentLight: '#3D3428', gold: '#B8964E',
    divider: '#333333', white: '#FFFFFF', black: '#0D0D0D',
    error: '#E57373', overlay: 'rgba(0, 0, 0, 0.6)',
    tabBar: '#0D0D0D', tabBarBorder: '#333333', tabInactive: '#6B6B6B', tabActive: '#FAFAF8',
    text: '#FAFAF8', border: '#333333', notification: '#E57373',
    icon: '#A3A3A3', tint: '#C8A97E',
  },
});
export { Colors };
export default Colors;
`;

/** @/constants/theme -> fonts, spacing, borderRadius */
export const constantsThemeShim = `
export var fonts = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  sansMedium: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  sansLight: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
};
export var spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export var borderRadius = { sm: 6, md: 12, lg: 20, xl: 28, full: 999 };
export default { fonts, spacing, borderRadius };
`;

/**
 * Returns shim code as {moduleName, code} pairs for the inline module registry.
 */
export function getShimModuleEntries(): Array<{ moduleName: string; code: string }> {
  return [
    { moduleName: "react-native", code: reactNativeShim },
    { moduleName: "react-native-web", code: reactNativeShim },
    { moduleName: "expo-haptics", code: expoHapticsShim },
    { moduleName: "expo-blur", code: expoBlurShim },
    { moduleName: "react-native-reanimated", code: reanimatedShim },
    { moduleName: "expo-image", code: expoImageShim },
    { moduleName: "expo-status-bar", code: expoStatusBarShim },
    { moduleName: "expo-linear-gradient", code: expoLinearGradientShim },
    { moduleName: "expo-font", code: expoFontShim },
    { moduleName: "react-native-safe-area-context", code: safeAreaContextShim },
    { moduleName: "@react-navigation/native", code: reactNavigationNativeShim },
    { moduleName: "@react-navigation/bottom-tabs", code: reactNavigationBottomTabsShim },
    { moduleName: "@react-navigation/native-stack", code: reactNavigationNativeStackShim },
    { moduleName: "react-native-gesture-handler", code: gestureHandlerShim },
    { moduleName: "react-native-paper", code: reactNativePaperShim },
    { moduleName: "@expo/vector-icons", code: expoVectorIconsShim },
    { moduleName: "expo-constants", code: expoConstantsShim },
    { moduleName: "react-native-svg", code: reactNativeSvgShim },
    { moduleName: "@react-native-async-storage/async-storage", code: asyncStorageShim },
    { moduleName: "expo-router", code: expoRouterShim },
    { moduleName: "expo-splash-screen", code: expoSplashScreenShim },
    { moduleName: "lucide-react-native", code: lucideReactNativeShim },
    { moduleName: "@/constants/colors", code: constantsColorsShim },
    { moduleName: "constants/colors", code: constantsColorsShim },
    { moduleName: "@/constants/theme", code: constantsThemeShim },
    { moduleName: "constants/theme", code: constantsThemeShim },
  ];
}
