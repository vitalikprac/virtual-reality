export const controls = [
  {
    id: 'eyeSeparation',
    label: 'Eye Separation',
    min: 0,
    max: 10,
    step: 0.01,
    value: 2,
    elementRef: null,
  },
  {
    id: 'fov',
    label: 'Field of View',
    min: 0.5,
    max: 3,
    step: 0.01,
    value: 1.45,
    elementRef: null,
  },
  {
    id: 'nearClippingDistance',
    label: 'Near Clipping Distance',
    min: 1,
    max: 20,
    step: 0.5,
    value: 10,
    elementRef: null,
  },
  {
    id: 'convergenceDistance',
    label: 'Convergence distance',
    min: 1,
    max: 100,
    step: 1,
    value: 40,
    elementRef: null,
  },
];


export const renderControls = (selector) => {
  const container = document.querySelector(selector)
  container.innerHTML = '';
  controls.forEach((control) => {
    const div = document.createElement('div');
    const divWrapper = document.createElement('div');
    divWrapper.classList.add('title-wrapper')
    const label = document.createElement('label');
    label.setAttribute('for', control.id);
    label.innerHTML = control.label;
    const span = document.createElement('span');
    span.setAttribute('class', 'slider-value');
    span.innerHTML = control.value;
    
    const input = document.createElement('input');
    input.setAttribute('id', control.id);
    input.setAttribute('type', 'range');
    input.setAttribute('min', control.min);
    input.setAttribute('max', control.max);
    input.setAttribute('step', control.step);
    input.setAttribute('value', control.value);
    input.addEventListener('input', (e) => {
      span.innerHTML = e.target.value;
    });
    control.elementRef = input;
    div.appendChild(divWrapper)
    divWrapper.appendChild(label)
    divWrapper.appendChild(span)
    div.appendChild(input);
    container.appendChild(div);
  });
};

export const getValueById = (controlId) => {
  const control = controls.find((control) => control.id === controlId);
  return parseFloat(control?.elementRef?.value,10);
}