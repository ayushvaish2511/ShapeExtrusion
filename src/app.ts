import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Mesh, VertexData, LinesMesh, VertexBuffer } from "@babylonjs/core";

import earcut from 'earcut';

// Make earcut available globally for BabylonJS to use
declare global {
  interface Window {
    earcut: typeof earcut;
  }
}
window.earcut = earcut;

// Enum to represent different interaction modes
enum Mode {
    Draw,
    Move,
    VertexEdit
}

class App {
    // Class properties
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private mode: Mode;
    private points: Vector3[];
    private shapes: Mesh[];
    private selectedShape: Mesh | null;
    private previousPointerPosition: Vector3 | null;
    private currentShape: Mesh | null;
    private vertexMarkers: Mesh[];
    private tempLines: LinesMesh | null;

    constructor() {
        // Initialize the canvas and engine
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.engine = new Engine(this.canvas, true);

        // Create the scene and set up the camera
        this.scene = new Scene(this.engine);
        this.camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 4, 10, new Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);

        // Add a light to the scene
        new HemisphericLight("light1", new Vector3(1, 1, 0), this.scene);

        // Initialize class properties
        this.mode = Mode.Draw;
        this.points = [];
        this.shapes = [];
        this.selectedShape = null;
        this.previousPointerPosition = null;
        this.currentShape = null;
        this.vertexMarkers = [];
        this.tempLines = null;

        // Set up the scene
        this.createGround();
        this.addEventListeners();

        // Start the render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        // Add debug layer toggle (Shift+Ctrl+Alt+I)
        window.addEventListener("keydown", (ev) => {
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'i') {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });
    }

    // Create a ground plane for the scene
    private createGround() {
        const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        ground.material = groundMaterial;
        ground.isPickable = true;
    }

    // Add event listeners for user interactions
    private addEventListeners() {
        this.canvas.addEventListener("pointerdown", (event: PointerEvent) => this.onPointerDown(event));
        this.canvas.addEventListener("pointermove", (event: PointerEvent) => this.onPointerMove(event));
        this.canvas.addEventListener("pointerup", () => this.onPointerUp());
        
        // Add button click listeners
        const buttons = ["drawButton", "extrudeButton", "moveButton", "vertexEditButton"];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener("click", () => {
                    switch (buttonId) {
                        case "drawButton": this.setMode(Mode.Draw); break;
                        case "moveButton": this.setMode(Mode.Move); break;
                        case "vertexEditButton": this.setMode(Mode.VertexEdit); break;
                        case "extrudeButton": this.extrudeShape(); break;
                    }
                });
            }
        });
    }

    // Set the current interaction mode
    private setMode(newMode: Mode) {
        this.mode = newMode;
        this.canvas.style.cursor = this.mode === Mode.Draw ? "crosshair" : "default";
        this.clearVertexMarkers();
        this.selectedShape = null;
        this.previousPointerPosition = null;
        if (this.mode === Mode.Draw) {
            this.points = [];
            this.clearTempShapes();
        } else if (this.mode === Mode.VertexEdit) {
            this.shapes.forEach(shape => {
                if (shape.name === "pyramid" || shape.name === "cuboid") {
                    this.createVertexMarkers(shape);
                }
            });
        }
    }

    // Clear temporary shapes used for drawing
    private clearTempShapes() {
        this.shapes.forEach(shape => {
            if (shape.name === "drawPoint") shape.dispose();
        });
        this.shapes = this.shapes.filter(shape => shape.name !== "drawPoint");
        if (this.tempLines) {
            this.tempLines.dispose();
            this.tempLines = null;
        }
    }
    
    // Handle pointer down events
    private onPointerDown(event: PointerEvent) {
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pickResult?.hit) return;
    
        const pickedMesh = pickResult.pickedMesh;
        const pickedPoint = pickResult.pickedPoint;
    
        if (this.mode === Mode.Draw) {
            if (pickedMesh.name === "ground" && pickedPoint) {
                const drawPoint = new Vector3(pickedPoint.x, 0, pickedPoint.z);
                this.points.push(drawPoint);
                this.drawPoint(drawPoint);
                this.updateTempLines();
            }
        } else if (this.mode === Mode.Move) {
            if (pickedMesh.name === "pyramid" || pickedMesh.name === "cuboid") {
                this.selectedShape = pickedMesh as Mesh;
                this.previousPointerPosition = pickedPoint;
            }
        } else if (this.mode === Mode.VertexEdit) {
            if (pickedMesh && pickedMesh.name.startsWith("vertexMarker")) {
                this.selectedShape = pickedMesh.parent as Mesh;
                this.previousPointerPosition = pickedPoint;
            }
        }
    }
    
    // Handle pointer move events
    private onPointerMove(event: PointerEvent) {
        if (!this.selectedShape || !this.previousPointerPosition) return;
    
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pickResult?.hit) return;
    
        const currentPointerPosition = pickResult.pickedPoint;
        if (!currentPointerPosition) return;
    
        const delta = currentPointerPosition.subtract(this.previousPointerPosition);
    
        if (this.mode === Mode.Move) {
            // Move only in X and Z directions
            this.selectedShape.position.addInPlace(new Vector3(delta.x, 0, delta.z));
        } else if (this.mode === Mode.VertexEdit) {
            const pickedMesh = pickResult.pickedMesh;
            if (pickedMesh && pickedMesh.name.startsWith("vertexMarker")) {
                const vertexIndex = parseInt(pickedMesh.name.split("_")[1]);
                this.updateVertex(this.selectedShape, vertexIndex, delta);
            }
        }
    
        this.previousPointerPosition = currentPointerPosition;
    }
    
    // Handle pointer up events
    private onPointerUp() {
        this.selectedShape = null;
        this.previousPointerPosition = null;
    }

    // Draw a point in the scene
    private drawPoint(point: Vector3) {
        const sphere = MeshBuilder.CreateSphere("drawPoint", { diameter: 0.1 }, this.scene);
        sphere.position = point;
        this.shapes.push(sphere);
    }

    // Update temporary lines while drawing
    private updateTempLines() {
        if (this.tempLines) {
            this.tempLines.dispose();
        }
        const lines = [...this.points];
        if (lines.length > 1) {
            lines.push(lines[0]); // Always close the shape
        }
        this.tempLines = MeshBuilder.CreateLines("tempLines", { points: lines }, this.scene);
    }

    // Extrude the drawn shape into a 3D object
    private extrudeShape() {
        if (this.points.length < 3 || this.points.length > 4) {
            console.log("Please draw either 3 points for a pyramid or 4 points for a cuboid.");
            return;
        }
    
        let shape: Mesh;
        const center = this.calculateCenter(this.points);
    
        if (this.points.length === 3) {
            shape = this.createPyramid(this.points);
        } else if (this.points.length === 4) {
            shape = this.createCuboid(this.points);
        } else {
            return;
        }
    
        const material = new StandardMaterial("shapeColor", this.scene);
        material.diffuseColor = Color3.Random();
        shape.material = material;
        
        shape.position = center;
    
        this.shapes.push(shape);
    
        this.clearTempShapes();
        this.points = [];
    }
    
    // Create a pyramid from 3 points
    private createPyramid(points: Vector3[]): Mesh {
        const [p1, p2, p3] = points;
        const height = 2;
    
        const pyramid = MeshBuilder.CreatePolyhedron("pyramid", {
            type: 1,
            size: 1,
            updatable: true
        }, this.scene);
    
        const baseWidth = Vector3.Distance(p1, p2);
        const baseDepth = Vector3.Distance(p1, p3);
        pyramid.scaling = new Vector3(baseWidth, height, baseDepth);
    
        const angle = Math.atan2(p2.z - p1.z, p2.x - p1.x);
        pyramid.rotation.y = angle;
    
        return pyramid;
    }
    
    // Create a cuboid from 4 points
    private createCuboid(points: Vector3[]): Mesh {
        const [p1, p2, p3, p4] = points;
        const height = 2;
    
        const width = Math.max(
            Vector3.Distance(p1, p2),
            Vector3.Distance(p3, p4)
        );
        const depth = Math.max(
            Vector3.Distance(p2, p3),
            Vector3.Distance(p4, p1)
        );
    
        const cuboid = MeshBuilder.CreateBox("cuboid", {
            width: width,
            height: height,
            depth: depth,
            updatable: true
        }, this.scene);
    
        const angle = Math.atan2(p2.z - p1.z, p2.x - p1.x);
        cuboid.rotation.y = angle;
    
        return cuboid;
    }
    
    // Calculate the center point of a set of points
    private calculateCenter(points: Vector3[]): Vector3 {
        let centerX = 0, centerZ = 0;
        for (let point of points) {
            centerX += point.x;
            centerZ += point.z;
        }
        return new Vector3(centerX / points.length, 1, centerZ / points.length);
    }
    
    // Create vertex markers for a mesh
    private createVertexMarkers(mesh: Mesh) {
        if (!mesh) return;
        this.clearVertexMarkers();
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (positions) {
            for (let i = 0; i < positions.length; i += 3) {
                const marker = MeshBuilder.CreateSphere(`vertexMarker_${i/3}`, { diameter: 0.1 }, this.scene);
                marker.position = new Vector3(positions[i], positions[i+1], positions[i+2]);
                marker.parent = mesh;
                this.vertexMarkers.push(marker);
            }
        }
    }

    // Clear all vertex markers
    private clearVertexMarkers() {
        this.vertexMarkers.forEach(marker => marker.dispose());
        this.vertexMarkers = [];
    }

    // Update a vertex position
    private updateVertex(mesh: Mesh, vertexIndex: number, delta: Vector3) {
        if (!mesh) return;
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (positions) {
            positions[vertexIndex * 3] += delta.x;
            positions[vertexIndex * 3 + 1] += delta.y;
            positions[vertexIndex * 3 + 2] += delta.z;
            mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
            this.updateVertexMarkers(mesh);
        }
    }
    
    // Update positions of vertex markers
    private updateVertexMarkers(mesh: Mesh) {
        if (!mesh) return;
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (positions) {
            for (let i = 0; i < this.vertexMarkers.length; i++) {
                const marker = this.vertexMarkers[i];
                marker.position = new Vector3(
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2]
                );
            }
        }
    }
}

new App();