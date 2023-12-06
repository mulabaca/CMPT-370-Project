class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.state.trains = [];
        this.collectibles = [];

        this.direction = Object.freeze({
            NORTH: 0,
            EAST: 1,
            SOUTH: 2,
            WEST: 3
        });

        this.steer = Object.freeze({
            LEFT: 0,
            FORWARD: 1,
            RIGHT: 2
        });
        this.CAMERA_DISTANCE = 8;
        this.CAMERA_HEIGHT = 5;
    }

    

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    createTrainCollider(object, radius, onCollide = null) {
        object.collider = {
            type: "TRAIN",
            radius: radius,
            onCollide: onCollide ? onCollide : (otherObject) => {
                if(otherObject.name.includes("train") || otherObject.name.includes("oil_tank")){
                    if (((object.previous == null) || (otherObject.name != this.getObject(object.previous).name)) && 
                    ((object.next == null) || (otherObject.name != this.getObject(object.next).name))) {
                        console.log("train Collision!");
                        this.kill(object);
                        this.kill(otherObject);
                    }
                }
                
            }
        };
        this.collidableObjects.push(object);
    }

    createItemCollider(object, radius, onCollide = null) {
        object.collider = {
            type: "ITEM",
            radius: radius,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log("Item Picked Up");
                let mapKeys = Object.keys(this.state.map);
                let randomKey = mapKeys[Math.floor(mapKeys.length * Math.random())].split(",");
                object.model.position = vec3.fromValues(parseInt(randomKey[0]), 0, parseInt(randomKey[1]));

                otherObject.grow = true;
                vec3.scale(otherObject.model.scale, otherObject.model.scale, 1.2);
            }
        };
        this.collidableObjects.push(object);
    }

    checkCollision(object) {
        // loop over all the other collidable objects 
        this.collidableObjects.forEach(otherObject => {

            if(object != otherObject && vec3.distance(object.model.position, otherObject.model.position) < (object.collider.radius + otherObject.collider.radius)){
                object.collider.onCollide(otherObject);
            }
                
        });
    }

    kill(train){
        if(train.next){
            let next = this.getObject(train.next);
            next.previous = null;
        }
        train.alive = false;
        vec3.add(train.model.position, train.model.position, vec3.fromValues(0.0,-5.0,0.0));

        while(train.previous != null){
            train = this.getObject(train.previous);
            vec3.add(train.model.position, train.model.position, vec3.fromValues(0,-5,0));
            train.alive = false;
        }
    }

    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");

        //set up camera
        this.defaultCameraPos = vec3.fromValues(this.CAMERA_DISTANCE, this.CAMERA_HEIGHT, 0); //player position is 0,0,0

        console.log("Attaching trains");
        this.attachTrains();
        //console.log(this.state);

        this.player = this.state.trains[0]; //No train selection yet.

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);


        this.tickStart = new Date().getTime();
        this.tickLength = 500;

        var camera = this.state.camera;

        camera.position = vec3.fromValues(0, 35.0, 0);
        camera.up = vec3.fromValues(0, 0, -1);
        camera.front = vec3.fromValues(0, -35.0, 0);

        // example - setting up a key press event to move an object in the scene
        document.addEventListener("keydown", (e) => {
            e.preventDefault();

            switch (e.key) {
                case "a":
                    if(this.getObject(this.player).steer == this.steer.FORWARD){ // No double steering
                        this.getObject(this.player).steer = this.steer.LEFT;
                    }
                    break;

                case "d":
                    if(this.getObject(this.player).steer == this.steer.FORWARD){ 
                        this.getObject(this.player).steer = this.steer.RIGHT;
                    }
                    break;

                case "z":
                    camera.position = vec3.fromValues(0, 35.0, 0);
                    camera.up = vec3.fromValues(0, 0, -1);
                    camera.front = vec3.fromValues(0, -35.0, 0);
                    this.perspective = 1;

                default:
                    break;
            }
        });
        document.addEventListener("keyup", (e) => {
            e.preventDefault();

            switch (e.key) {

                case "a":
                    
                    if(this.getObject(this.player).steer == this.steer.LEFT){ 
                        this.getObject(this.player).steer = this.steer.FORWARD;
                    }
                    break;

                case "d":
                    if(this.getObject(this.player).steer == this.steer.RIGHT){ 
                        this.getObject(this.player).steer = this.steer.FORWARD;
                    }
                    break;

                    case "z":
                        this.perspective = 0;

                default:
                    break;
            }
        });

    }

    /**
     * Only call this at start of game.
     * Connects trains with their corresponding carts.
     */
    attachTrains(){
        for (let i = 0; i < this.state.objects.length; i++) {
            var train = this.getObject(i);
            if(train.name.includes("train") || train.name.includes("oil_tank")){ //if train
                train.coords = [train.model.position[0], train.model.position[2]]; //save train x,z coords during tick
                train.direction = this.direction.WEST; //should change when detecting other carts. Only the engine cart should have this

                train.alive = true;
                train.grow = false;
                train.lastgrow= false;
                train.last_rotation = train.model.rotation;
                train.steerRotation = this.steer.FORWARD;
                train.last_steer = this.steer.FORWARD;
                this.state.camera.last_pos = this.state.camera.position;

                train.previous = null; //no other carts right now
                this.state.trains.push(i); // more to move

                this.createTrainCollider(train, 0.5);

            }else if(train.name.includes("collectible") ){
                this.createItemCollider(train, 0.5);
                this.collectibles.push(i);
            }
        }
        for (let i = 0; i < this.state.trains.length; i++) {  //connect the rest of carts
            train = this.getObject(this.state.trains[i]);
            if(train.name.includes("train")){
                
                train.steer = this.steer.FORWARD;
                train.previous = this.findDirection(train);
                
                let otherTrain = this.getObject(train.previous);
                otherTrain.next = this.state.trains[i];
                otherTrain.previous = null;
            }
        }
    }


    /**
     * 
     * @param {String} name 
     * @returns 
     */
    FindByName(name){
        let obj = ""; 
        this.state.objects.forEach(object => {
            if(object.name.trim() === name.trim()){
                obj = object;
            }
        });
        return obj;        
    }

    /**
     * for whatever reason, state.objects gets resorted, breaking everything.
     * @param {int} i index where object used to be
     * @returns correct object
     */
    getObject(i){
        if(i != null){
            const name = this.state.loadObjects[i].name;
            return this.FindByName(name);
        }
        return null;
        
    }

    /**
     * finds direction and connects cart
     * @param {*} train 
     * @returns attached trained
     */
    findDirection(train){
        for (let i = 0; i < this.state.trains.length; i++) {
            let  otherTrainID = this.state.trains[i];
            let otherTrain = this.getObject(otherTrainID);
            let Xdiff = otherTrain.model.position[0] - train.model.position[0];
            let Zdiff = otherTrain.model.position[2] - train.model.position[2];
            
            if(Xdiff == 2 && Zdiff == 0){

                train.direction = this.direction.WEST;
                return otherTrainID;
            }
            else if(Xdiff == -2 && Zdiff == 0){
                train.direction = this.direction.EAST;
                return otherTrainID;
            }
            else if(Zdiff == 2 && Xdiff == 0){
                train.direction = this.direction.NORTH;
                return otherTrainID;
            }
            else if(Zdiff == -2 && Xdiff == 0){
                train.direction = this.direction.SOUTH;
                return otherTrainID;
            }
        }
    }

    /**
     * Updates entire train to the next track
     * @param {int} trainIndex 
     */
    advanceTrain(trainIndex){
        //console.log("steering:");
        //console.log(this.getObject(this.player).steer);
        let train = this.getObject(trainIndex);
        //console.log(train);

        this.state.camera.last_pos = this.state.camera.position;

        //console.log(train);
        //console.log(trainIndex);
        if(!train.name.includes("train") || !train.alive){
            return;
        }

        if(train.grow){
            if(!train.previous){
                this.createNewCart(train);
            }else{
                train.lastgrow = true;
                train.grow = false;
                vec3.scale(train.model.scale, train.model.scale, 1.0/1.2);
            }

        }
        
        if(train.previous){
            var following = this.getObject(train.previous);
        }

        
        train.last_coords = train.coords;
        this.rotateCart(train, 1);
        train.last_rotation = train.model.rotation;
        this.state.camera.last_pos = this.state.camera.position;

        train.last_steer = train.steerRotation;

        if(trainIndex != this.player){
            train.steer = Math.floor(Math.random() * 3);
        }

        //move to next track
        if((train.coords[0].toString() +"," + train.coords[1].toString()) in this.state.map){
            var exit = null;

            if (train.direction == this.direction.SOUTH || train.direction == this.direction.EAST) {
                exit = this.state.map[train.coords[0].toString() +"," + train.coords[1].toString()][0];
            }else{
                exit = this.state.map[train.coords[0].toString() +"," + train.coords[1].toString()][1];
            }

            if(!exit[0] && !exit[1] && !exit[2]){
                //move forward
                this.updateCoords(train, this.steer.FORWARD);
            }

            else if(train.steer == this.steer.LEFT){
                if(exit[0]){
                    this.updateCoords(train, this.steer.LEFT);
                }else if(exit[1]){
                    this.updateCoords(train, this.steer.FORWARD);
                }else{
                    this.updateCoords(train, this.steer.RIGHT);
                }
            }
            else if(train.steer == this.steer.FORWARD){
                if(exit[1]){
                    this.updateCoords(train, this.steer.FORWARD);
                }else if(exit[0]){
                    this.updateCoords(train, this.steer.LEFT);
                }else{
                    this.updateCoords(train, this.steer.RIGHT);
                }
            }else{ //if steer right
                if(exit[2]){
                    this.updateCoords(train, this.steer.RIGHT);
                }else if(exit[1]){
                    this.updateCoords(train, this.steer.FORWARD);
                }else{
                    this.updateCoords(train, this.steer.LEFT);
                }
            }
        }else{
            this.updateCoords(train, this.steer.FORWARD);
        }

        // console.log("Advancing...");
        // console.log(train.last_coords);
        // console.log("to");
        // console.log(train.coords);
        
        //update the rest of the carts

        if(!train.previous){
            return;
        }

        while(following != null){

            if(train.lastgrow){
                train.lastgrow = false;
                following.lastgrow = following.grow;
                following.grow = true;
                vec3.scale(following.model.scale, following.model.scale, 1.2);
            }else if(following.grow){
                if(!following.previous){
                    this.createNewCart(following);
                }else{
                    following.lastgrow = true;
                    following.grow = false;
                    vec3.scale(following.model.scale, following.model.scale, 1.0/1.2);
                }
            }

            following.last_rotation = following.model.rotation;
            following.model.rotation = train.last_rotation;
            following.last_steer = following.steerRotation;
            following.steerRotation = train.last_steer;

            following.last_coords = following.coords;
            following.coords = train.last_coords;
            following.coords = train.last_coords; //pass last coords to following cart

            

            train = this.getObject(train.previous);
            following = this.getObject(train.previous);

            
        }
        
        
    }

    async createNewCart(train){

        const ID = this.state.loadObjects.length;
        let templateId = 0;
        this.state.trains.forEach(id => {
            if(this.getObject(id).name == "oil_tank"){
                templateId = id;
            }
        });

        train.grow = false;
        train.lastgrow = false;
        vec3.scale(train.model.scale, train.model.scale, 1.0/1.2);

        let newCart = {...this.state.loadObjects[templateId]};
        newCart.name = "oil_tank" + ID.toString();
        newCart.model = "oil_tank.obj";
        newCart.position = train.model.position;
        newCart.rotation = train.last_rotation;
        newCart.material = train.material; //same color
        this.state.loadObjects.push(newCart);
        await addMesh(newCart);
        train.previous = ID;
        this.state.trains.push(ID);
        newCart = this.FindByName("oil_tank" + ID.toString());
        this.state.trains.forEach(id => {
            if(this.getObject(id).name == train.name){
                newCart.next = id;
            }
        });

        newCart.alive = true;
        newCart.grow = false;
        newCart.lastgrow = false;
        newCart.last_rotation = train.model.rotation;
        newCart.steerRotation = train.last_steer
        newCart.last_steer = this.steer.FORWARD;
        newCart.previous = null; //no other carts right now
        this.createTrainCollider(newCart, 0.5);
    }

    /**
     * 
     * @param {*} train 
     * @param {int} steer 
     * @returns 
     */
    updateCoords(train, steer){
        // console.log("updating to:");
        // console.log(steer);
        // console.log(this.steer.FORWARD);
        let coords = train.coords;
        let direction = train.direction; 
        switch (direction) {
            case this.direction.EAST:
                switch (steer) {
                    case this.steer.LEFT:
                        train.coords = [coords[0] + 2, coords[1] - 2];
                        train.direction = this.direction.NORTH;
                        train.steerRotation = this.steer.LEFT;
                        
                        break;

                    case this.steer.FORWARD:
                        train.coords = [coords[0] + 2, coords[1]];
                        train.steerRotation = this.steer.FORWARD;
                        break;

                    case this.steer.RIGHT:
                        train.coords = [coords[0] + 2, coords[1] + 2];
                        train.direction = this.direction.SOUTH;
                        train.steerRotation = this.steer.RIGHT;
                        break;
                
                    default:
                        break;
                }
                
                break;

            case this.direction.NORTH:
                switch (steer) {
                    case this.steer.LEFT:
                        train.coords = [coords[0] - 2, coords[1] - 2];
                        train.direction = this.direction.WEST;
                        train.steerRotation = this.steer.LEFT;
                        break;

                    case this.steer.FORWARD:
                        train.coords = [coords[0], coords[1] - 2];
                        train.steerRotation = this.steer.FORWARD;
                        break;

                    case this.steer.RIGHT:
                        train.coords = [coords[0] + 2, coords[1] - 2];
                        train.direction = this.direction.EAST;
                        train.steerRotation = this.steer.RIGHT;
                        break;
                
                    default:
                        break;
                }
                
                break;

            case this.direction.WEST:
                
                switch (steer) {
                    case this.steer.LEFT:
                        train.coords = [coords[0] - 2, coords[1] + 2];
                        train.direction = this.direction.SOUTH;
                        train.steerRotation = this.steer.LEFT;
                        break;

                    case this.steer.FORWARD:
                        train.coords = [coords[0] - 2, coords[1]];
                        train.steerRotation = this.steer.FORWARD;
                        break;

                    case this.steer.RIGHT:
                        train.coords = [coords[0] - 2, coords[1] - 2];
                        train.direction = this.direction.NORTH;
                        train.steerRotation = this.steer.RIGHT;
                        break;
                
                    default:
                        break;
                }
                
                break;

            case this.direction.SOUTH:
                
                switch (steer) {
                    case this.steer.LEFT:
                        train.coords = [coords[0] + 2, coords[1] + 2];
                        train.direction = this.direction.EAST;
                        train.steerRotation = this.steer.LEFT;
                        break;

                    case this.steer.FORWARD:
                        train.coords = [coords[0], coords[1] + 2];
                        train.steerRotation = this.steer.FORWARD;
                        break;

                    case this.steer.RIGHT:
                        train.coords = [coords[0] - 2, coords[1] + 2];
                        train.direction = this.direction.WEST;
                        train.steerRotation = this.steer.RIGHT;
                        break;
                
                    default:
                        break;
                }
                
                break;
        
            default:
                break;
        }
        return train

    }


    /**
     * Interpolates position of cart between ticks
     * @param {*} train 
     * @param {*} tickProgress 
     */
    moveCart(train, tickProgress){
        // At + (1-t)B
        if(train.last_coords){
            
            const A = vec3.fromValues(train.coords[0], 0.0, train.coords[1]);
            const B = vec3.fromValues(train.last_coords[0], 0.0, train.last_coords[1]);

            train.model.position = vec3.add([],vec3.scale([], A, tickProgress), vec3.scale([], B, 1-tickProgress));
        }
        return train;
    }

    /**
     * Rotates cart in curved rail
     * @param {*} train 
     * @param {*} tickProgress 
     */
    rotateCart(train, tickProgress){
        var degrees;

        switch (train.steerRotation) {
            case this.steer.LEFT:
                degrees = Math.PI*tickProgress/2;
                break;

            case this.steer.RIGHT:
                degrees = -Math.PI*tickProgress/2;
                break;
        
            default:
                return;
        }
        
        let rotation = mat4.rotateY([], train.last_rotation, degrees);
        train.model.rotation = rotation;
    }

    rotateCamera(train, tickProgress){
        var degrees;
        switch (train.steerRotation) {
            case this.steer.LEFT:
                degrees = Math.PI*tickProgress/2 - Math.PI/2;
                break;

            case this.steer.RIGHT:
                degrees = -Math.PI*tickProgress/2 + Math.PI/2;
                break;
        
            default:
                return;
        }
        
        vec3.rotateY(this.state.camera.position, this.state.camera.last_pos, train.model.position, degrees);
    }

    updateDefaultCameraPos(mainTrain){
        switch (mainTrain.direction) {
            case this.direction.EAST:
                this.defaultCameraPos = vec3.fromValues(-this.CAMERA_DISTANCE, this.CAMERA_HEIGHT, 0);
                break;
            
            case this.direction.NORTH:
                this.defaultCameraPos = vec3.fromValues(0, this.CAMERA_HEIGHT, this.CAMERA_DISTANCE);
                break;
            
            case this.direction.WEST:
                this.defaultCameraPos = vec3.fromValues(this.CAMERA_DISTANCE, this.CAMERA_HEIGHT, 0);
                break;
            
            case this.direction.SOUTH:
                this.defaultCameraPos = vec3.fromValues(0, this.CAMERA_HEIGHT, -this.CAMERA_DISTANCE);
                break;
        
            default:
                break;
        }
    }


    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        var mainTrain = this.getObject(this.player);
        

        const then = new Date();
        var tickProgress = (then.getTime() - this.tickStart)/this.tickLength;
        if(tickProgress >= 1){
            this.state.trains.forEach(trainIndex => {
                this.advanceTrain(trainIndex);
            });
            this.tickStart += this.tickLength;
            tickProgress -= 1;
            console.log("Tick");
        }

        //move and interpolate rotation for each train
        this.state.trains.forEach(id => {
            let object = this.getObject(id);

            if(object.alive){

                object = this.moveCart(object, tickProgress);
                this.rotateCart(object, tickProgress);
                this.checkCollision(object);
            }
        });

        this.collectibles.forEach(id => {
            let object = this.getObject(id);
            mat4.rotateY(object.model.rotation, object.model.rotation, deltaTime);
            this.checkCollision(object);
        });

        if (!this.perspective && mainTrain.alive) {
            this.state.camera.up = vec3.fromValues(0,1,0);
            this.updateDefaultCameraPos(mainTrain);
            vec3.add(this.state.camera.position, mainTrain.model.position, this.defaultCameraPos);
            this.rotateCamera(mainTrain, tickProgress);
            vec3.subtract(this.state.camera.front, mainTrain.model.position, this.state.camera.position);
        }
        
    }
    
}