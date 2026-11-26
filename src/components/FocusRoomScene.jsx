import React from 'react';
import studyScene from '../assets/focus-study-room-realistic.jpg';
import breakScene from '../assets/focus-break-room-realistic.jpg';
import restScene from '../assets/focus-rest-bed-realistic.jpg';

const SCENES = {
  studying: {
    image: studyScene,
    label: 'উষ্ণ আলোয় ডেস্কে মনোযোগ দিয়ে পড়াশোনা করছে',
  },
  break: {
    image: breakScene,
    label: 'পড়ার বিরতিতে চেয়ারে হেলান দিয়ে বিশ্রাম নিচ্ছে',
  },
  resting: {
    image: restScene,
    label: 'বিছানায় কাত হয়ে শান্তিতে ঘুমাচ্ছে',
  },
};

/**
 * FocusRoomScene — realistic, state-aware room artwork for Focus and Zen.
 *
 * The generated room plates share a black-coffee study-bedroom, the same
 * student, camera and a clear right-side wall for the live timer. `wallClock`
 * is intentionally rendered as SVG foreignObject content so Zen can keep its
 * real React clock and accessible view controls over the artwork.
 */
export default function FocusRoomScene({ status = 'offline', fill = true, tall = false, wallClock = null }) {
  const mode = status === 'studying'
    ? 'studying'
    : status === 'break' || status === 'paused'
      ? 'break'
      : 'resting';
  const scene = SCENES[mode];

  return (
    <svg
      className={`focus-room-scene is-${mode} ${tall ? 'is-tall' : ''}`.trim()}
      viewBox="0 0 1376 768"
      preserveAspectRatio={fill ? 'xMidYMid slice' : 'xMidYMid meet'}
      role={wallClock ? 'group' : 'img'}
      aria-label={wallClock ? `${scene.label} — ঘড়ি নিয়ন্ত্রণ` : scene.label}
    >
      <image
        href={scene.image}
        x="0"
        y="0"
        width="1376"
        height="768"
        preserveAspectRatio="none"
        aria-hidden="true"
      />
      {wallClock && (
        <foreignObject x="1010" y="64" width="350" height="430">
          <div
            // eslint-disable-next-line react/no-unknown-property
            xmlns="http://www.w3.org/1999/xhtml"
            className="focus-room-clock-slot"
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              overflow: 'visible',
            }}
          >
            {wallClock}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
