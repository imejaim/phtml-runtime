// PHTML Runtime JS

let currentSlide = 0;
let editMode = false;
let selectedBox = null;
let dragState = null;
let resizeState = null;

const slides = [...document.querySelectorAll('.phtml-slide')];
const statusEl = document.querySelector('.phtml-status');
const fontSizeInput = document.getElementById('phtml-fontSize');
const colorPicker = document.getElementById('phtml-colorPicker');

function showSlide(index){
  currentSlide = Math.max(0, Math.min(slides.length-1, index));
  slides.forEach((s,i)=>s.classList.toggle('active',i===currentSlide));
  selectedBox=null; updateSelectedUI(); updateStatus();
}

function nextSlide(){if(!editMode) showSlide(currentSlide+1);}
function prevSlide(){if(!editMode) showSlide(currentSlide-1);}

function updateStatus(){statusEl.textContent = `${editMode?'편집 모드':'발표 모드'} · ${currentSlide+1}/${slides.length}`;}

function toggleEdit(){
  editMode=!editMode;
  document.body.classList.toggle('phtml-edit-mode',editMode);
  document.querySelectorAll('.phtml-box').forEach(box=>box.setAttribute('contenteditable',editMode?'true':'false'));
  if(!editMode) selectedBox=null;
  updateSelectedUI(); updateStatus();
}

function selectBox(box){if(!editMode) return; selectedBox=box; updateSelectedUI();}
function updateSelectedUI(){document.querySelectorAll('.phtml-box').forEach(b=>b.classList.remove('selected')); if(selectedBox) selectedBox.classList.add('selected');}

function requireSelected(){if(!selectedBox){alert('박스를 선택하세요'); return false;} return true;}

function addBox(){const box=document.createElement('div'); box.className='phtml-box body'; box.style.left='90px'; box.style.top='120px'; box.style.width='420px'; box.style.height='90px'; box.style.fontSize='28px'; box.innerHTML='새 박스'; document.querySelector('.phtml-slide.active .phtml-canvas').appendChild(box); selectBox(box); box.focus();}

function duplicateBox(){if(!requireSelected()) return; const clone=selectedBox.cloneNode(true); clone.style.left=(parseFloat(selectedBox.style.left)+30)+'px'; clone.style.top=(parseFloat(selectedBox.style.top)+30)+'px'; selectedBox.parentElement.appendChild(clone); selectBox(clone);}
function deleteBox(){if(!requireSelected()) return; selectedBox.remove(); selectedBox=null; updateSelectedUI();}

showSlide(0);