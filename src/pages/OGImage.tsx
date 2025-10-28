import React from 'react';
import { useSearchParams } from 'react-router-dom';

const OGImage = () => {
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || 'Jamia';
  const subtitle = searchParams.get('subtitle') || 'Trova e Organizza Jam di AcroYoga';
  return (
    <div 
      style={{
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative elements */}
      <div 
        style={{
          position: 'absolute',
          top: '50px',
          left: '100px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '120px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)'
        }}
      />
      
      {/* AcroYoga silhouettes */}
      <div style={{ position: 'absolute', top: '200px', left: '300px' }}>
        {/* Base person */}
        <div style={{
          width: '50px',
          height: '120px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '25px',
          position: 'relative'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '50%',
            position: 'absolute',
            top: '-20px',
            left: '5px'
          }} />
        </div>
      </div>
      
      <div style={{ position: 'absolute', top: '150px', right: '300px' }}>
        {/* Flyer person */}
        <div style={{
          width: '40px',
          height: '100px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '20px',
          position: 'relative',
          transform: 'rotate(-20deg)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '50%',
            position: 'absolute',
            top: '-18px',
            left: '2px'
          }} />
        </div>
      </div>
      
      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <h1 style={{
          fontSize: '72px',
          fontWeight: '700',
          color: 'white',
          margin: '0 0 20px 0',
          textShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          {title}
        </h1>
        
        <p style={{
          fontSize: '32px',
          color: 'rgba(255,255,255,0.9)',
          margin: '0 0 30px 0',
          fontWeight: '400'
        }}>
          {subtitle}
        </p>
        
        <div style={{
          width: '400px',
          height: '6px',
          background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '3px',
          margin: '0 auto'
        }} />
      </div>
      
      {/* Decorative dots */}
      <div style={{
        position: 'absolute',
        top: '400px',
        left: '150px',
        width: '6px',
        height: '6px',
        background: 'white',
        borderRadius: '50%',
        opacity: 0.6
      }} />
      <div style={{
        position: 'absolute',
        top: '420px',
        left: '180px',
        width: '4px',
        height: '4px',
        background: 'white',
        borderRadius: '50%',
        opacity: 0.6
      }} />
      <div style={{
        position: 'absolute',
        top: '350px',
        right: '200px',
        width: '6px',
        height: '6px',
        background: 'white',
        borderRadius: '50%',
        opacity: 0.6
      }} />
    </div>
  );
};

export default OGImage;
