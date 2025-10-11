import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { openLink } from '@telegram-apps/sdk-react';
import { Button, Text } from '@telegram-apps/telegram-ui';

import type { DashboardPromoMetadata, DashboardPromoSlot } from './types.ts';

import styles from './PromoSlider.module.css';

type Props = {
  slots: DashboardPromoSlot[];
  rotationSeconds?: number;
  metadata?: DashboardPromoMetadata;
};

const MIN_ROTATION_SECONDS = 4;

export function PromoSlider({ slots, rotationSeconds = 6, metadata }: Props) {
  const intervalRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeSlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.active)
        .slice(0, metadata?.maxSlots ?? 3),
    [slots, metadata?.maxSlots],
  );

  const effectiveRotationSec = Math.max(rotationSeconds, MIN_ROTATION_SECONDS);

  const clearAutoplay = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const scheduleAutoplay = useCallback(() => {
    clearAutoplay();
    if (activeSlots.length <= 1) {
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setActiveIndex((previous) => {
        const nextIndex = previous + 1;
        if (nextIndex >= activeSlots.length) {
          return 0;
        }
        return nextIndex;
      });
    }, effectiveRotationSec * 1000);
  }, [activeSlots.length, clearAutoplay, effectiveRotationSec]);

  useEffect(() => {
    if (activeSlots.length === 0) {
      setActiveIndex(0);
      clearAutoplay();
      return;
    }
    setActiveIndex((current) => Math.min(current, activeSlots.length - 1));
    scheduleAutoplay();
    return () => {
      clearAutoplay();
    };
  }, [activeSlots.length, scheduleAutoplay, clearAutoplay]);

  const handleDotClick = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }
      setActiveIndex(index);
      scheduleAutoplay();
    },
    [activeIndex, scheduleAutoplay],
  );

  const handleOpenLink = useCallback((slot: DashboardPromoSlot) => {
    if (!slot.ctaLink) {
      return;
    }
    openLink(slot.ctaLink);
  }, []);

  if (activeSlots.length === 0) {
    return null;
  }

  return (
    <section className={styles.slider}>
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {activeSlots.map((slot) => {
          const accent = slot.accentColor ?? '#0f172a';

          return (
            <article key={slot.id} className={styles.slide}>
              <div
                className={styles.slideInner}
                style={{
                  backgroundImage: `linear-gradient(135deg, ${accent}, rgba(4, 7, 15, 0.94))`,
                }}
              >
                <div className={styles.slideContent}>
                  <Text weight='3' className={styles.slideTitle}>
                    {slot.title}
                  </Text>
                  {slot.subtitle && (
                    <Text weight='2' className={styles.slideSubtitle}>
                      {slot.subtitle}
                    </Text>
                  )}
                  {slot.ctaLabel && slot.ctaLink && (
                    <Button mode='filled' size='l' onClick={() => handleOpenLink(slot)}>
                      {slot.ctaLabel}
                    </Button>
                  )}
                </div>
                {slot.imageUrl && (
                  <img
                    className={styles.slideImage}
                    src={slot.imageUrl}
                    alt=''
                    role='presentation'
                    loading='lazy'
                  />
                )}
              </div>
            </article>
          );
          })}
        </div>
      </div>
      {activeSlots.length > 1 && (
        <div className={styles.dots}>
          {activeSlots.map((slot, index) => (
            <button
              key={slot.id}
              type='button'
              className={index === activeIndex ? styles.dotActive : styles.dot}
              aria-label={`Show slide ${index + 1}`}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
