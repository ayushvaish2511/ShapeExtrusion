# Babylon.js 2D Shape Extrusion and Manipulation

This project is a Babylon.js application that allows users to draw arbitrary 2D shapes on a ground plane, extrude them into 3D objects, and manipulate those objects by moving them and editing their vertices.

## Features

- Draw 2D shapes on a ground plane
- Extrude 2D shapes into 3D objects (pyramids for triangles, cuboids for quadrilaterals)
- Move extruded objects on the ground plane
- Edit vertices of extruded objects in 3D space
- Visual mode indicators and object selection feedback

## Installation

1. Clone this repository
2. Navigate to the project directory
3. Run `npm install` to install dependencies

## Usage

1. Run `npm start` to start the development server
2. Open a web browser and navigate to `http://localhost:8080` (or the port specified in your console)

## Controls

- **Draw Mode**: Left-click to add points, right-click to complete the shape
- **Move Mode**: Click and drag objects to move them on the ground plane
- **Vertex Edit Mode**: Click and drag vertices to modify object shapes

## Code Structure

The application is built using TypeScript and Babylon.js. The main `App` class handles the core functionality:

- `constructor`: Sets up the Babylon.js scene, camera, and event listeners
- `createGround`: Creates the ground plane for drawing
- `addEventListeners`: Sets up user interaction handlers
- `setMode`: Switches between different interaction modes
- `onPointerDown`, `onPointerMove`, `onPointerUp`: Handle user input for drawing, moving, and editing
- `extrudeShape`: Creates 3D objects from 2D shapes
- `createPyramid`, `createCuboid`: Generate 3D meshes based on user input
- `updateVertex`: Modifies vertex positions during editing

## Styling

Basic styling is applied to the canvas and UI elements to improve visual presentation. The `styles.css` file contains these styles.

## Future Improvements

- Add support for more complex shapes
- Implement undo/redo functionality
- Add texture mapping capabilities
- Optimize performance for larger scenes

## Dependencies

- Babylon.js
- TypeScript
- Webpack (for bundling)
