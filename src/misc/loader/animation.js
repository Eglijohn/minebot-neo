export function LoadingAnimation(animation, length) {
    let frameIndex = 0;
    const totalFrames = animation.frames.length;

    const intervalId = setInterval(() => {
        process.stdout.write('\r' + animation.frames[frameIndex]);
        
        frameIndex = (frameIndex + 1) % totalFrames;
    }, animation.interval);

    setTimeout(() => {
        clearInterval(intervalId);
        console.log('\n');
    }, length);
}