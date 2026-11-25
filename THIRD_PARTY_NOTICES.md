# Third-party notices

Code in this repository adapted from other open-source projects. Packages installed from npm carry their own licences.

## ShaderGradient (MIT, ruucm): https://github.com/ruucm/shadergradient
Used in `src/components/3d/shaders/liquidStage.ts`: the idea of a noise-displaced plane and its three-colour mix
(two colours across the surface, a third by height). The repository has no licence file; its packages declare MIT.

## liquid-glass-js (MIT): https://github.com/dashersw/liquid-glass-js
Copyright (c) 2025 Armagan Amcalar. Used in `src/components/3d/shaders/liquidStage.ts` and
`src/components/landing/LiquidGlass.tsx`: the edge, rim and base refraction falloff and the rounded-rectangle distance.

## Simplex noise (MIT): Ashima Arts and Stefan Gustavson
Used in `src/components/3d/shaders/noise.ts`.

### MIT licence (applies to the projects above)
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Not used as code
[Liquid Logo](https://github.com/paper-design/liquid-logo) (Paper, PolyForm Shield 1.0.0) inspired the liquid metal mark. Its
licence restricts competing products, so none of its code is here; the shader was written for this project.
