/* Native dialog keeps Escape, focus trapping and focus return available. */
(() => {
  const trigger=document.getElementById('aboutButton');
  const dialog=document.getElementById('aboutDialog');
  if(!trigger||!dialog)return;
  trigger.addEventListener('click',()=>dialog.showModal());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
  });
})();
