<?php
// ⚙️ CONFIG : valeurs données par votre hébergeur (cPanel > MySQL Databases)
$DB=['host'=>'localhost','name'=>'NOM_BASE','user'=>'UTILISATEUR','pass'=>'MOT_DE_PASSE'];
date_default_timezone_set('Africa/Douala'); session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax']); session_start();
header('Content-Type: application/json; charset=utf-8');
$db=new PDO("mysql:host={$DB['host']};dbname={$DB['name']};charset=utf8mb4",$DB['user'],$DB['pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
$in=json_decode(file_get_contents('php://input'),true)?:[]; $a=$_GET['a']??''; $uid=$_SESSION['uid']??0; $adm=($_SESSION['role']??'')==='admin';
function q($s,$p=[]){global $db;$r=$db->prepare($s);$r->execute($p);return $r;}
function out($d){echo json_encode($d);exit;} function err($m){out(['error'=>$m]);}
function need($c){if(!$c){http_response_code(403);err('Accès refusé');}}
function fmt($r){$r['passage_days']=json_decode($r['passage_days'],true)?:[];$r['plans']=['name'=>$r['pname']];$r['profiles']=['full_name'=>$r['full_name'],'phone'=>$r['phone'],'quartier'=>$r['quartier'],'address'=>$r['address']];return $r;}
$SEL="SELECT s.*,p.name pname,pr.full_name,pr.phone,pr.quartier,pr.address FROM subscriptions s JOIN plans p ON p.id=s.plan_id JOIN profiles pr ON pr.user_id=s.user_id";
switch($a){
case 'me': out(['user'=>$uid?['id'=>$uid]:null,'admin'=>$adm,'plans'=>q("SELECT * FROM plans ORDER BY position")->fetchAll()]);
case 'register':
  $e=strtolower(trim($in['email']??'')); $pw=$in['password']??'';
  if(!filter_var($e,FILTER_VALIDATE_EMAIL))err('E-mail invalide'); if(strlen($pw)<6)err('Mot de passe : 6 caractères minimum');
  if(q("SELECT id FROM users WHERE email=?",[$e])->fetch())err('Cet e-mail existe déjà');
  $role=q("SELECT COUNT(*) c FROM users")->fetch()['c']==0?'admin':'user'; // le 1er inscrit devient admin
  q("INSERT INTO users(email,password_hash,role) VALUES(?,?,?)",[$e,password_hash($pw,PASSWORD_DEFAULT),$role]); $id=(int)$db->lastInsertId();
  q("INSERT INTO profiles(user_id,full_name) VALUES(?,?)",[$id,trim($in['full_name']??'')]);
  session_regenerate_id(true); $_SESSION['uid']=$id; $_SESSION['role']=$role; out(['ok'=>1]);
case 'login':
  $u=q("SELECT * FROM users WHERE email=?",[strtolower(trim($in['email']??''))])->fetch();
  if(!$u||!password_verify($in['password']??'',$u['password_hash']))err('E-mail ou mot de passe incorrect');
  session_regenerate_id(true); $_SESSION['uid']=(int)$u['id']; $_SESSION['role']=$u['role']; out(['ok'=>1]);
case 'logout': session_destroy(); out(['ok'=>1]);
case 'my': need($uid);
  $sub=q("$SEL WHERE s.user_id=? ORDER BY s.id DESC LIMIT 1",[$uid])->fetch();
  out(['profile'=>q("SELECT * FROM profiles WHERE user_id=?",[$uid])->fetch(),'sub'=>$sub?fmt($sub):null]);
case 'profile_save': need($uid);
  q("UPDATE profiles SET full_name=?,phone=?,quartier=?,address=? WHERE user_id=?",[$in['full_name'],$in['phone'],$in['quartier'],$in['address'],$uid]); out(['ok'=>1]);
case 'sub_create': need($uid);
  $p=q("SELECT * FROM plans WHERE id=?",[(int)$in['plan_id']])->fetch(); $d=array_values(array_unique($in['passage_days']??[]));
  if(!$p||count($d)!=$p['passages_per_week'])err('Pack ou jours invalides');
  if(q("SELECT id FROM subscriptions WHERE user_id=? AND status IN('pending','active')",[$uid])->fetch())err('Vous avez déjà une demande en cours');
  q("INSERT INTO subscriptions(user_id,plan_id,amount,passage_days,payer_name,payer_phone,payment_ref) VALUES(?,?,?,?,?,?,?)",[$uid,$p['id'],$p['price'],json_encode($d,JSON_UNESCAPED_UNICODE),$in['payer_name'],$in['payer_phone'],$in['payment_ref']]);
  $pr=q("SELECT * FROM profiles WHERE user_id=?",[$uid])->fetch();
  q("INSERT INTO notifications(user_id,audience,kind,message) VALUES(?,'admin','new_request',?)",[$uid,"Nouvelle demande : {$pr['full_name']} ({$pr['quartier']}) - {$p['name']} - Réf paiement : {$in['payment_ref']}"]); out(['ok'=>1]);
case 'admin_data': need($adm);
  q("UPDATE subscriptions SET status='expired' WHERE status='active' AND end_date<CURDATE()");
  out(['subs'=>array_map('fmt',q("$SEL ORDER BY s.id DESC")->fetchAll()),'notifs'=>q("SELECT * FROM notifications ORDER BY id DESC LIMIT 200")->fetchAll()]);
case 'admin_validate': need($adm); $id=(int)$in['id'];
  $s=q("$SEL WHERE s.id=?",[$id])->fetch(); if(!$s)err('Introuvable');
  if(!empty($in['ok'])){$d1=date('Y-m-d');$d2=date('Y-m-d',strtotime('+30 days'));
    q("UPDATE subscriptions SET status='active',start_date=?,end_date=?,validated_at=NOW() WHERE id=?",[$d1,$d2,$id]);
    q("INSERT INTO notifications(user_id,audience,phone,kind,message) VALUES(?,'client',?,'activated',?)",[$s['user_id'],$s['phone'],"Bonjour {$s['full_name']}, votre abonnement Clean & Services est actif du $d1 au $d2. Propreté assurée !"]);
  } else q("UPDATE subscriptions SET status='rejected' WHERE id=?",[$id]); out(['ok'=>1]);
case 'admin_mark': need($adm); q("UPDATE subscriptions SET ".((int)$in['d']<=1?'reminded_1d':'reminded_3d')."=1 WHERE id=?",[(int)$in['id']]); out(['ok'=>1]);
case 'admin_sent': need($adm); q("UPDATE notifications SET sent=1 WHERE id=?",[(int)$in['id']]); out(['ok'=>1]);
default: err('Action inconnue');
}
