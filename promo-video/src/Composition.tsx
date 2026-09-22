import {useEffect,useState} from 'react';
import {AbsoluteFill,continueRender,delayRender,staticFile,cancelRender} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {Hook} from './scenes/Hook';
import {Direct} from './scenes/Direct';
import {Edit} from './scenes/Edit';
import {Code} from './scenes/Code';
import {Engines} from './scenes/Engines';
import {Closing} from './scenes/Closing';
export const Promo = () => {
 const [handle]=useState(()=>delayRender('Loading bundled Chinese fonts'));
 useEffect(()=>{Promise.all([document.fonts.load('400 40px "Noto Sans SC Variable"','图画好了还在补字体新罗马换图例放左下角字号再小一点为了几处改动又来回聊轮把最后交给鼠标运行绘脚本直接编辑形保留细节调整修改不只面里支持随导出次能重现实际结果前后偏移数值便于阅读已四舍五入从发着熟悉工作流完成范围各引擎不同以对应台为准少多线体验默认中文鼠尾草绿'),document.fonts.load('750 96px "Noto Sans SC Variable"','图画好了还在补把最后几步交给鼠标拖图例调字号修改不只留在画面里从绘图脚本出发少多一点直接')]).then(()=>document.fonts.ready).then(()=>continueRender(handle)).catch(cancelRender)},[handle]);
 return <AbsoluteFill><TransitionSeries>
 <TransitionSeries.Sequence durationInFrames={165}><Hook/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>
 <TransitionSeries.Sequence durationInFrames={135}><Direct/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>
 <TransitionSeries.Sequence durationInFrames={255}><Edit/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>
 <TransitionSeries.Sequence durationInFrames={225}><Code/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>
 <TransitionSeries.Sequence durationInFrames={135}><Engines/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>
 <TransitionSeries.Sequence durationInFrames={105}><Closing/></TransitionSeries.Sequence>
 </TransitionSeries><Audio src={staticFile('sfx.wav')}/></AbsoluteFill>
};
