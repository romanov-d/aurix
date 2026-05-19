export const FLEET = [
  {id:'mercedes-amg-sl43', name:'Mercedes-AMG SL 43', year:2022, body:'Кабриолет', fuel:'Бензин', engine:'3.0 л', power:'390 л.с.', drive:'Автомат', price:38000, badge:'Новинка',
   img:'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=1200&auto=format&fit=crop&q=80'},
  {id:'porsche-911', name:'Porsche 911 Carrera', year:2025, body:'Купе', fuel:'Бензин', engine:'3.0 л', power:'394 л.с.', drive:'Автомат', price:42000, badge:'Топ',
   img:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80'},
  {id:'porsche-718', name:'Porsche 718 Boxster', year:2024, body:'Кабриолет', fuel:'Бензин', engine:'2.0 л', power:'300 л.с.', drive:'Автомат', price:32000,
   img:'https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=1200&auto=format&fit=crop&q=80'},
  {id:'bmw-m4', name:'BMW M4 Competition', year:2023, body:'Купе', fuel:'Бензин', engine:'3.0 л', power:'510 л.с.', drive:'Автомат', price:36000,
   img:'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&auto=format&fit=crop&q=80'},
  {id:'rolls-cullinan', name:'Rolls-Royce Cullinan', year:2024, body:'Внедорожник', fuel:'Бензин', engine:'6.75 л', power:'571 л.с.', drive:'Автомат', price:120000, badge:'VIP',
   img:'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=1200&auto=format&fit=crop&q=80'},
  {id:'mercedes-g63', name:'Mercedes-Benz G63 AMG', year:2024, body:'Внедорожник', fuel:'Бензин', engine:'4.0 л', power:'585 л.с.', drive:'Автомат', price:55000,
   img:'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=1200&auto=format&fit=crop&q=80'},
  {id:'lambo-urus', name:'Lamborghini Urus', year:2023, body:'Внедорожник', fuel:'Бензин', engine:'4.0 л', power:'650 л.с.', drive:'Автомат', price:78000, badge:'Хит',
   img:'https://images.unsplash.com/photo-1633509817627-5b9c071e6126?w=1200&auto=format&fit=crop&q=80'},
  {id:'bentley-continental', name:'Bentley Continental GT', year:2023, body:'Купе', fuel:'Бензин', engine:'6.0 л', power:'635 л.с.', drive:'Автомат', price:68000,
   img:'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&auto=format&fit=crop&q=80'}
];

export function fmtRuDate(s){
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
