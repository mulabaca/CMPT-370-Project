class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.state.trains = []
    }

    // example - we can add our own custom method to our game and call it using 'this.customMethod()'
    customMethod() {
        console.log("Custom method!");
    }

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    // createSphereCollider(object, radius, onCollide = null) {
    //     object.collider = {
    //         type: "SPHERE",
    //         radius: radius,
    //         onCollide: onCollide ? onCollide : (otherObject) => {
    //             console.log(`Collided with ${otherObject.name}`);
    //         }
    //     };
    //     this.collidableObjects.push(object);
    // }

    // example - function to check if an object is colliding with collidable objects
    // checkCollision(object) {
    //     // loop over all the other collidable objects 
    //     this.collidableObjects.forEach(otherObject => {
    //         // do a check to see if we have collided, if we have we can call object.onCollide(otherObject) which will
    //         // call the onCollide we define for that specific object. This way we can handle collisions identically for all
    //         // objects that can collide but they can do different things (ie. player colliding vs projectile colliding)
    //         // use the modeling transformation for object and otherObject to transform position into current location
    //     });
    // }

    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");

        console.log("Attaching trains");
        this.attachTrains();
        console.log(this.state);

        this.player = this.state.trains[0]; //No train selection yet.

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);


        // example - set an object in onStart before starting our render loop!
        this.cube = getObject(this.state, "train");
        const otherCube = getObject(this.state, "cube2"); // we wont save this as instance var since we dont plan on using it in update

        this.tickStart = new Date().getTime();
        this.tickLength = 1000;

        // example - create sphere colliders on our two objects as an example, we give 2 objects colliders otherwise
        // no collision can happen
        // this.createSphereCollider(this.cube, 0.5, (otherObject) => {
        //     console.log(`This is a custom collision of ${otherObject.name}`)
        // });
        // this.createSphereCollider(otherCube, 0.5);

        // example - setting up a key press event to move an object in the scene
        document.addEventListener("keydown", (e) => {
            e.preventDefault();

            switch (e.key) {
                case "a":
                    if(this.getObject(this.player).steer == 1){ // No double steering
                        this.getObject(this.player).steer = 0;
                    }
                    break;

                case "d":
                    if(this.getObject(this.player).steer == 1){ 
                        this.getObject(this.player).steer = 2;
                    }
                    break;

                default:
                    break;
            }
        });
        document.addEventListener("keyup", (e) => {
            e.preventDefault();

            switch (e.key) {
                case "a":
                    this.cube.translate(vec3.fromValues(4, 0, 0));
                    break;

                case "d":
                    this.cube.translate(vec3.fromValues(-4, 0, 0));
                    if(this.getObject(this.player).steer == 0){ 
                        this.getObject(this.player).steer = 1;
                    }
                    break;

                case "d":
                    if(this.getObject(this.player).steer == 2){ 
                        this.getObject(this.player).steer = 1;
                    }
                    break;

                default:
                    break;
            }
        });

        this.customMethod(); // calling our custom method! (we could put spawning logic, collision logic etc in there ;) )

        // example: spawn some stuff before the scene starts
        // for (let i = 0; i < 10; i++) {
        //     for (let j = 0; j < 10; j++) {
        //         for (let k = 0; k < 10; k++) {
        //             spawnObject({
        //                 name: `new-Object${i}${j}${k}`,
        //                 type: "cube",
        //                 material: {
        //                     diffuse: randomVec3(0, 1)
        //                 },
        //                 position: vec3.fromValues(4 - i, 5 - j, 10 - k),
        //                 scale: vec3.fromValues(0.5, 0.5, 0.5)
        //             }, this.state);
        //         }
        //     }
        // }

        // for (let i = 0; i < 10; i++) {
        //     let tempObject = await spawnObject({
        //         name: `new-Object${i}`,
        //         type: "cube",
        //         material: {
        //             diffuse: randomVec3(0, 1)
        //         },
        //         position: vec3.fromValues(4 - i, 0, 0),
        //         scale: vec3.fromValues(0.5, 0.5, 0.5)
        //     }, this.state);


        // tempObject.constantRotate = true; // lets add a flag so we can access it later
        // this.spawnedObjects.push(tempObject); // add these to a spawned objects list

        // tempObject.collidable = true;
        // tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
        //     console.log(`I collided with ${object.name}!`);
        // };
        // }
    }

    /**
     * Only call this at start of game.
     * Connects trains with their corresponding carts.
     */
    attachTrains(){
        for (let i = 0; i < this.state.objects.length; i++) {
            var train = this.getObject(i);
            if(train.name.includes("trainFront")||train.name.includes("trainType")){ //if train
                train.current_rail = this.state.map[Math.round(train.model.position[0]).toString()+","+ Math.round(train.model.position[2]).toString()]; //save rail on train
                this.getObject(train.current_rail).isBusyBy = i; //set rail to busy/occupied by index train
                train.last_rotation = train.model.rotation;
            }
        }
        for (let i = 0; i < this.state.objects.length; i++) {
            train = this.getObject(i);
            if(train.name.includes("trainFront")){

                train.steer = 1; //set steer value: 0 = left, 1 = forward, 2 = right
                this.state.trains.push(i);

                let tracking = i;
                let ahead = null;
                while (tracking != null) {
                    train = this.getObject(tracking);
                    train.next = ahead;
                    ahead = tracking;
                    tracking = this.backTrackTrack(train.current_rail);
                    train.previous = tracking;
                } 
            }
        }
    }

    /**
     * backtracks through train tracks to find the attached carts
     * @param {int} trackIndex 
     * @returns 
     */
    backTrackTrack(trackIndex){
        var exit = null;
        if(this.getObject(trackIndex).direction != 2){
            //check exit2
            for (let i = 0; i < 3; i++) {

                exit = this.getObject(trackIndex).exit2[i];
                if (exit != null && this.getObject(exit).isBusyBy){
                    this.getObject(trackIndex).direction = 1;
                    this.setDirection(this.getObject(exit), trackIndex);
                    return this.getObject(exit).isBusyBy; //return train index
                }
            }
        }
        if(this.getObject(trackIndex).direction != 1){
            //check the other direction
            for (let i = 0; i < 3; i++) {
                exit = this.getObject(trackIndex).exit1[i]
                if (exit != null && this.getObject(exit).isBusyBy){
                    this.getObject(trackIndex).direction = 2;
                    this.setDirection(this.getObject(exit), trackIndex);
                    return this.getObject(exit).isBusyBy; //return train index
                }
            }
        }
        return null;
    }

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
     * @param {*} i index where object used to be
     * @returns correct object
     */
    getObject(i){
        if(i != null){
            const name = this.state.loadObjects[i].name;
            return this.FindByName(name);
        }
        
    }

    /**
     * sets train direction on the traintrack
     * @param {*} track 
     * @param {int} headIndex Traintrack index of the other cart
     * @param {boolean} [backtrack=true] true if used while backtracking, else change to false
     */
    setDirection(track, headIndex, backtrack = true){
        //console.log("setting direction of");
        //console.log(track);
        if(track.exit1.includes(headIndex)){
            if(backtrack){
                track.direction = 1; //train going from exit2 to exit1
            }else{
                track.direction = 2;
            }
            
        }else{
            if(backtrack){
                track.direction = 2;
            }else{
                track.direction = 1;
            }
        }
    }

    /**
     * Updates entire train to the next track
     * @param {int} trainIndex 
     */
    advanceTrain(trainIndex){
        var train = this.getObject(trainIndex);
        
        var following = this.getObject(train.previous);
        train.last_rail = train.current_rail;
        var track = this.getObject(train.current_rail);

        //move to next track
        if(train.steer === 0 && track.direction === 1){
            if(track.exit1[0] != null) train.current_rail = track.exit1[0];
            else if(track.exit1[1] != null)train.current_rail = track.exit1[1];
            else train.current_rail = track.exit1[2];
        }
        else if(train.steer === 0 && track.direction === 2){
            if(track.exit2[0] != null) train.current_rail = track.exit2[0];
            else if(track.exit2[1] != null)train.current_rail = track.exit2[1];
            else train.current_rail = track.exit2[2];
        }
        else if(train.steer === 2 && track.direction === 1){
            if(track.exit1[2] != null) train.current_rail = track.exit1[2];
            else if(track.exit1[1] != null)train.current_rail = track.exit1[1];
            else train.current_rail = track.exit1[0];
        }
        else if(train.steer === 2 && track.direction === 2){
            if(track.exit2[2] != null) train.current_rail = track.exit2[2];
            else if(track.exit2[1] != null)train.current_rail = track.exit2[1];
            else train.current_rail = track.exit2[0];
        }
        else if (track.direction === 1) {
            if(track.exit1[1] != null) train.current_rail = track.exit1[1];
            else if(track.exit1[0] != null)train.current_rail = track.exit1[0];
            else train.current_rail = track.exit1[2];
        }
        else{
            if(track.exit2[1] != null) train.current_rail = track.exit2[1];
            else if(track.exit2[0] != null)train.current_rail = track.exit2[0];
            else train.current_rail = track.exit2[2];
        }

        // console.log("Advancing...");
        // console.log(train.last_rail);
        // console.log(this.getObject(train.last_rail))
        // console.log("to");
        // console.log(train.current_rail);
        
        this.setDirection(this.getObject(train.current_rail), train.last_rail, false);

        //update the rest of the carts
        while(following != null){
            if(following.last_rail){
                this.getObject(following.last_rail).isBusyBy = null;
            }
            following.last_rail = following.current_rail;
            following.current_rail = train.last_rail;
            train = following;
            
            following = this.getObject(following.previous);
            this.setDirection(this.getObject(train.current_rail), train.last_rail, false);
        }
    }

    /**
     * Interpolates position of cart between ticks
     * @param {*} train 
     * @param {*} tickProgress 
     */
    moveCart(train, tickProgress){
        // At + (1-t)B
        if(train.last_rail){

            const A = this.getObject(train.current_rail).model.position;
            const B = this.getObject(train.last_rail).model.position;
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
        //from last_rotation turn (45 degrees * t)
    }

    advanceRotation(train){
        //set last_rotation to -/+ 45 deegrees if rotation happened
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        const then = new Date();
        var tickProgress = (then.getTime() - this.tickStart)/this.tickLength;
        if(tickProgress >= 1){
            this.state.trains.forEach(trainIndex => {
                console.log("Tick");
                this.advanceTrain(trainIndex);
            });
            this.tickStart += this.tickLength;
            tickProgress -= 1;
        }

        //TODO move and interpolate rotation
        this.state.objects.forEach(object => {
            if(object.name.includes("trainType") || object.name.includes("trainFront")){
                object = this.moveCart(object, tickProgress);
            }
        });
    }
    
}
