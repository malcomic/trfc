import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { getGallery } from '../api/gallery';
import { AlertCircle, X, ChevronLeft, ChevronRight, ZoomIn, Image, Play } from 'lucide-react';
import { pageRoot } from '../utils/themeClasses';
function isVideo(item) {
    return item.media_type === 'video';
}
function GalleryMedia({ item, className, onLoad, thumbnail = false, }) {
    if (isVideo(item)) {
        return (_jsx("video", { src: item.media_url, className: className, controls: !thumbnail, muted: true, playsInline: true, preload: "metadata", onLoadedData: onLoad, onError: (e) => {
                e.target.style.display = 'none';
                onLoad?.();
            } }));
    }
    return (_jsx("img", { src: item.media_url, alt: item.caption || 'TRFC Gallery', className: className, onLoad: onLoad, onError: (e) => {
            e.target.style.display = 'none';
            onLoad?.();
        } }));
}
export default function Gallery() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    useEffect(() => {
        fetchGallery();
    }, []);
    const fetchGallery = async () => {
        try {
            const data = await getGallery();
            setItems(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load gallery');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const openItem = (index) => {
        setImgLoaded(false);
        setSelectedIndex(index);
    };
    const closeModal = () => setSelectedIndex(null);
    const prev = useCallback(() => {
        if (selectedIndex === null)
            return;
        setImgLoaded(false);
        setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
    }, [selectedIndex, items.length]);
    const next = useCallback(() => {
        if (selectedIndex === null)
            return;
        setImgLoaded(false);
        setSelectedIndex((selectedIndex + 1) % items.length);
    }, [selectedIndex, items.length]);
    useEffect(() => {
        if (selectedIndex === null)
            return;
        const onKey = (e) => {
            if (e.key === 'ArrowLeft')
                prev();
            if (e.key === 'ArrowRight')
                next();
            if (e.key === 'Escape')
                closeModal();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedIndex, prev, next]);
    // Lock scroll when lightbox open
    useEffect(() => {
        document.body.style.overflow = selectedIndex !== null ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedIndex]);
    const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
    const hasVideos = items.some(isVideo);
    const itemLabel = hasVideos ? 'item' : 'photo';
    // Assign grid spans for a masonry-feel layout
    const getSpan = (index) => {
        const pattern = [
            'md:col-span-2 md:row-span-2', // large
            'md:col-span-1 md:row-span-1', // small
            'md:col-span-1 md:row-span-1', // small
            'md:col-span-1 md:row-span-1', // small
            'md:col-span-1 md:row-span-1', // small
            'md:col-span-2 md:row-span-1', // wide
        ];
        return pattern[index % pattern.length] || '';
    };
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "relative overflow-hidden bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-16 pb-12", children: [_jsx("p", { className: "absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none letter-spacing-tighter", "aria-hidden": "true", children: "GALLERY" }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-10 flex items-end justify-between gap-4 flex-wrap", children: [_jsxs("div", { children: [_jsx("p", { className: "flex items-center gap-2.5 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3.5 before:block before:w-5 before:h-0.5 before:bg-fire", children: "Community Moments" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light letter-spacing-tighter", children: ["OUR", _jsx("br", {}), _jsx("span", { className: "text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "GALLERY" })] })] }), _jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light pb-0.5", children: loading ? '—' : `${items.length} ${itemLabel}${items.length !== 1 ? 's' : ''}` })] })] }), _jsx("div", { className: "bg-fire overflow-hidden py-0.75 animated-gallery-ticker", children: _jsx("div", { className: "flex whitespace-nowrap animate-galleryTicker", children: Array(4).fill(null).map((_, i) => (_jsxs("span", { className: "flex items-center", children: [_jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white px-9", children: "TRFC COMMUNITY" }), _jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white/40 px-9", children: "\u2726" }), _jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white px-9", children: "SWEAT \u00B7 RACE \u00B7 CELEBRATE" }), _jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white/40 px-9", children: "\u2726" }), _jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white px-9", children: "NAIROBI RUNS" }), _jsx("span", { className: "font-bebas text-xs letter-spacing-widest text-white/40 px-9", children: "\u2726" })] }, i))) }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400", children: [_jsx(AlertCircle, { size: 15, className: "flex-shrink-0 mt-0.5" }), _jsx("span", { children: error })] })), loading && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-0.5", children: Array(9).fill(null).map((_, i) => (_jsx("div", { className: `bg-ash light:bg-ash-light relative overflow-hidden ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`, style: { aspectRatio: '1' }, children: _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" }) }, i))) })), !loading && !error && items.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-28 text-center", children: [_jsxs("p", { className: "font-bebas text-clamp-2xl text-fire/5 leading-none mb-4 letter-spacing-tighter", children: ["COMING", _jsx("br", {}), "SOON"] }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-2", children: "Gallery is empty" }), _jsx("p", { className: "text-sm text-mist light:text-mist-light", children: "Photos from our events will appear here." })] })), !loading && !error && items.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-6", children: ["Showing ", _jsx("span", { className: "text-fire", children: items.length }), " ", itemLabel, items.length !== 1 ? 's' : ''] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 auto-rows-56 gap-0.5", children: items.map((item, index) => (_jsxs("div", { className: `group relative overflow-hidden bg-ash light:bg-ash-light cursor-pointer border border-transparent hover:border-fire/30 transition-all duration-300 hover:z-10 ${getSpan(index)}`, onClick: () => openItem(index), children: [_jsx(GalleryMedia, { item: item, thumbnail: true, className: "w-full h-full object-cover brightness-75 saturate-85 group-hover:scale-106 group-hover:brightness-90 group-hover:saturate-100 transition-all duration-500 ease-out" }), isVideo(item) && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: _jsx("div", { className: "w-12 h-12 bg-fire/90 flex items-center justify-center clip-angled", children: _jsx(Play, { size: 18, className: "text-white ml-0.5", fill: "white" }) }) })), _jsx("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center", children: _jsx("div", { className: "w-12 h-12 bg-fire flex items-center justify-center translate-y-3 group-hover:translate-y-0 transition-transform duration-300 ease-out clip-angled", children: isVideo(item) ? _jsx(Play, { size: 18, className: "text-white ml-0.5", fill: "white" }) : _jsx(ZoomIn, { size: 18, className: "text-white" }) }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" }), item.caption && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-0.5 group-hover:translate-y-0", children: _jsx("p", { className: "text-xs text-chalk light:text-chalk-light italic leading-tight line-clamp-2", children: item.caption }) })), _jsx("span", { className: "absolute top-3 right-3 font-bebas text-xs letter-spacing-tighter text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200", children: String(index + 1).padStart(2, '0') })] }, item.id))) })] }))] }), selectedItem && (_jsx("div", { className: "fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4", onClick: closeModal, children: _jsxs("div", { className: `relative w-full max-w-4xl flex flex-col bg-ink light:bg-ink-light border border-white/10 light:border-black/10 overflow-hidden clip-angled`, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-3.5 border-b border-white/5 light:border-black/8", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 before:block before:w-4 before:h-0.5 before:bg-fire", children: selectedIndex !== null ? `${selectedIndex + 1} / ${items.length}` : '' }), _jsx("button", { onClick: closeModal, className: "w-8 h-8 flex items-center justify-center border border-white/10 light:border-black/10 text-fog light:text-fog-light hover:border-fire hover:text-fire transition-colors duration-200 clip-angled-sm", "aria-label": "Close", children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "relative bg-night light:bg-night-light flex items-center justify-center", style: { minHeight: '420px', maxHeight: '65vh' }, children: [!imgLoaded && !isVideo(selectedItem) && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(Image, { size: 32, className: "text-fire/15" }) })), _jsx(GalleryMedia, { item: selectedItem, className: `max-w-full object-contain transition-opacity duration-300 ${imgLoaded || isVideo(selectedItem) ? 'opacity-100' : 'opacity-0'}`, onLoad: () => setImgLoaded(true) }, selectedItem.media_url), items.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); prev(); }, className: "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 border border-white/10 light:border-black/10 text-fog light:text-fog-light hover:border-fire hover:text-fire transition-all duration-200 clip-angled-sm", "aria-label": "Previous", children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("button", { onClick: (e) => { e.stopPropagation(); next(); }, className: "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 border border-white/10 light:border-black/10 text-fog light:text-fog-light hover:border-fire hover:text-fire transition-all duration-200 clip-angled-sm", "aria-label": "Next", children: _jsx(ChevronRight, { size: 16 }) })] }))] }), (selectedItem.caption || selectedItem.uploaded_at) && (_jsxs("div", { className: "px-6 py-4 border-t border-white/5 light:border-black/8 flex items-start justify-between gap-4 flex-wrap", children: [selectedItem.caption && (_jsx("p", { className: "text-sm text-chalk/60 light:text-chalk-light/60 italic leading-relaxed flex-1", children: selectedItem.caption })), selectedItem.uploaded_at && (_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light white-space-nowrap self-end", children: new Date(selectedItem.uploaded_at).toLocaleDateString('en-KE', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                    }) }))] })), items.length > 1 && (_jsx("div", { className: "border-t border-white/5 light:border-black/8 px-4 py-3 flex gap-1.5 overflow-x-auto", children: items.map((thumb, i) => (_jsx("button", { onClick: () => openItem(i), className: `flex-shrink-0 w-12 h-12 overflow-hidden border transition-all duration-200 clip-angled-sm ${i === selectedIndex
                                    ? 'border-fire brightness-100'
                                    : 'border-transparent brightness-50 hover:brightness-75'}`, "aria-label": `View ${itemLabel} ${i + 1}`, children: _jsx(GalleryMedia, { item: thumb, thumbnail: true, className: "w-full h-full object-cover" }) }, thumb.id))) }))] }) })), _jsx("style", { children: `
        @keyframes galleryTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-galleryTicker {
          animation: galleryTicker 22s linear infinite;
        }
      ` })] }));
}
//# sourceMappingURL=Gallery.js.map