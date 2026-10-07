import React from 'react';
import Particles from './Particles';
// Layered backdrop inspired by Jhon's memorial photo:
// soft morning-blue sky + still clouds + React Bits (ogl) Particles on top.
export default function HeavenBackground(){
  return <div className="heaven photo" aria-hidden="true">
    <div className="sky-glow"></div>
    <div className="ray r1"></div><div className="ray r2"></div>
    <div className="cloud p1"></div><div className="cloud p2"></div>
    <div className="cloud p3"></div><div className="cloud p4"></div>
    <div className="cloud p5"></div>
    <div className="ogl-particles">
      <Particles
        particleCount={160}
        particleSpread={9}
        speed={0.08}
        particleColors={['#ffffff', '#fff6d6', '#ffe9a8']}
        moveParticlesOnHover={true}
        particleHoverFactor={0.6}
        alphaParticles={true}
        particleBaseSize={90}
        sizeRandomness={0.8}
        cameraDistance={20}
        disableRotation={false}
      />
    </div>
  </div>;
}


