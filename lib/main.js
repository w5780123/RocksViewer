class ModelViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.currentModel = null;
        this.loadingManager = new THREE.LoadingManager();
        this.controls = null;
        this.modelQueue = [];
        this.isLoading = false;
        
        this.setupScene();
        this.setupControls();
        this.setupLoading();
        this.setupInfoPanel();
        this.createUI();
        this.loadInitialModel();
    }

    setupScene() {
        const container = document.getElementById('modelViewer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x303030);
        container.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-2, 3, -1);
        const targetObject = new THREE.Object3D()
        targetObject.position.set(0,0,0)
        directionalLight.target = targetObject
        this.scene.add(targetObject)
        this.scene.add(directionalLight);
        
        this.camera.position.set(-2, -0.5, -0.5);
        
        window.addEventListener('resize', () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            this.camera.aspect = newWidth / newHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(newWidth, newHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
        });
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 4;
        this.controls.maxPolarAngle = Math.PI;
    }

    setupLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('progress-bar-fill');

        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            progressBar.style.width = progress + '%';
        };

        this.loadingManager.onLoad = () => {
            loadingScreen.style.display = 'none';
            this.isLoading = false;
            if (this.modelQueue.length > 0) {
                const nextModel = this.modelQueue.shift();
                this.loadModel(nextModel);
            }
        };

        this.loadingManager.onError = (url) => {
            console.error('Error loading:', url);
            loadingScreen.innerHTML = `<h2>Error loading model</h2>`;
            this.isLoading = false;
        };
    }

    setupInfoPanel() {
        const infoPanel = document.getElementById('info-panel');
        const infoPanelHeader = document.getElementById('info-panel-header');
        const toggleText = document.getElementById('info-panel-toggle');
        
        infoPanelHeader.addEventListener('click', () => {
            const isExpanded = infoPanel.classList.contains('expanded');
            
            if (isExpanded) {
                infoPanel.classList.remove('expanded');
                toggleText.innerHTML = '⬆ 點擊展開';
            } else {
                infoPanel.classList.add('expanded');
                toggleText.innerHTML = '⬇ 點擊縮小';
            }
        });
    }

    createUI() {
        const sidebar = document.getElementById('sidebar');
        
        modelData.forEach(model => {
            const button = document.createElement('button');
            button.className = 'model-btn';
            
            const img = document.createElement('img');
            img.src = model.thumbnail;
            button.appendChild(img);
            
            button.addEventListener('click', () => {
                if (this.isLoading) {
                    this.modelQueue = [model]; // 清空隊列，只保留最新請求
                } else {
                    this.loadModel(model);
                }
            });
            
            sidebar.appendChild(button);
        });
    }

    loadInitialModel() {
        if (modelData.length > 0) {
            this.loadModel(modelData[0]);
        }
    }

    loadModel(modelData) {
        if (this.isLoading) {
            this.modelQueue.push(modelData);
            return;
        }
    
        this.isLoading = true;
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'flex';
    
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
    
        const loader = new THREE.GLTFLoader(this.loadingManager);
        
        loader.load(
            modelData.modelUrl,
            (gltf) => {
                this.currentModel = gltf.scene;
                this.scene.add(this.currentModel);
                
                const box = new THREE.Box3().setFromObject(this.currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                this.currentModel.scale.setScalar(scale);
                
                this.currentModel.position.sub(center.multiplyScalar(scale));
                
                this.camera.position.set(0, 0, 5);
                this.controls.reset();
                
                document.getElementById('info-description').innerHTML = modelData.info.description.replace(/\n/g, '<br>');
                document.getElementById('info-image').src = modelData.info.image;
                document.getElementById('model-title').textContent = modelData.name;
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total) * 100;
                document.getElementById('progress-bar-fill').style.width = progress + '%';
            },
            (error) => {
                console.error('Error loading model:', error);
                loadingScreen.innerHTML = `<h2>Error loading model</h2>`;
                this.isLoading = false;
            }
        );
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize application
const viewer = new ModelViewer();
viewer.animate();