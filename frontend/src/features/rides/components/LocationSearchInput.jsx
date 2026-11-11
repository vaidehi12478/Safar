import { useState, useEffect, useRef } from 'react'
import { autocompletePlaces } from '../../../services/api/ridesApi'

export function LocationSearchInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSelectLocation,
  onFocus = null,
  userCoords = null,
  type = 'pickup', // 'pickup' | 'destination'
  onUseCurrentLocation = null,
  loadingGps = false,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef(null)
  const debounceTimerRef = useRef(null)

  // Fetch suggestions when user types or opens dropdown
  useEffect(() => {
    if (!isOpen) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const lat = userCoords ? userCoords[0] : null
        const lng = userCoords ? userCoords[1] : null
        const results = await autocompletePlaces(value, lat, lng)
        setSuggestions(Array.isArray(results) ? results : [])
      } catch (err) {
        // Fallback gracefully on network error
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, value?.length >= 2 ? 280 : 0)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [value, isOpen, userCoords])

  // Dismiss on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleFocus() {
    setIsOpen(true)
    if (onFocus) onFocus()
  }

  function handleSelect(item) {
    const formatted = item.name || item.display_name.split(',')[0]
    onChange(formatted)
    onSelectLocation({
      name: formatted,
      display_name: item.display_name,
      coords: [item.latitude, item.longitude],
    })
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  function handleKeyDown(e) {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function renderCategoryIcon(category) {
    switch (category) {
      case 'airport':
        return (
          <span className="hub-icon hub-icon-airport" title="Airport">
            ✈️
          </span>
        )
      case 'railway':
        return (
          <span className="hub-icon hub-icon-railway" title="Train Station">
            🚆
          </span>
        )
      case 'metro':
        return (
          <span className="hub-icon hub-icon-metro" title="Metro">
            🚇
          </span>
        )
      case 'bus':
        return (
          <span className="hub-icon hub-icon-bus" title="Bus Station">
            🚌
          </span>
        )
      case 'mall':
        return (
          <span className="hub-icon hub-icon-mall" title="Shopping / Mall">
            🛍️
          </span>
        )
      case 'university':
        return (
          <span className="hub-icon hub-icon-university" title="Campus / University">
            🎓
          </span>
        )
      case 'landmark':
        return (
          <span className="hub-icon hub-icon-landmark" title="Landmark">
            🏛️
          </span>
        )
      default:
        return (
          <span className="hub-icon hub-icon-pin" title="Location">
            📍
          </span>
        )
    }
  }

  return (
    <div className="location-search-wrap" ref={containerRef}>
      <label htmlFor={id} className="location-input-label">
        <span className={`location-node-dot node-${type}`} aria-hidden="true" />
        <span className="label-text">{label}</span>
      </label>

      <div className="location-input-box">
        <input
          id={id}
          type="text"
          className="location-input-field"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            className="btn-clear-input"
            onClick={() => {
              onChange('')
              setIsOpen(true)
            }}
            title="Clear field"
            aria-label="Clear location input"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="location-dropdown-panel" role="listbox">
          {/* GPS Quick Action for Pickup */}
          {type === 'pickup' && onUseCurrentLocation && (
            <button
              type="button"
              className="dropdown-gps-btn"
              onClick={() => {
                onUseCurrentLocation()
                setIsOpen(false)
              }}
              disabled={loadingGps}
            >
              <div className="gps-icon-circle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
              </div>
              <div className="gps-btn-text">
                <span className="gps-btn-title">
                  {loadingGps ? 'Locating your GPS...' : 'Use Current Location'}
                </span>
                <span className="gps-btn-sub">Instant pickup via high-accuracy GPS</span>
              </div>
            </button>
          )}

          {/* Section Heading */}
          <div className="dropdown-section-header">
            {value.trim().length >= 2 ? (
              <span>Search Suggestions</span>
            ) : (
              <span>Nearby Popular Transit Hubs</span>
            )}
            {isLoading && <span className="dropdown-spinner" />}
          </div>

          {/* List of Suggestions */}
          <div className="dropdown-items-list">
            {suggestions.length === 0 && !isLoading ? (
              <div className="dropdown-empty-state">
                <span>No matching locations found. You can also click on the map.</span>
              </div>
            ) : (
              suggestions.map((item, index) => {
                const isSelected = index === selectedIndex
                return (
                  <div
                    key={item.place_id || `${item.latitude}-${item.longitude}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="item-icon-box">
                      {renderCategoryIcon(item.category)}
                    </div>
                    <div className="item-content-box">
                      <div className="item-title-row">
                        <span className="item-name">{item.name || item.display_name.split(',')[0]}</span>
                        <div className="item-badge-group">
                          {item.city && (
                            <span className="item-city-badge">{item.city}</span>
                          )}
                          {item.distance_km != null && (
                            <span className="item-distance">{item.distance_km} km</span>
                          )}
                        </div>
                      </div>
                      <span className="item-address" title={item.display_name}>
                        {item.display_name}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

