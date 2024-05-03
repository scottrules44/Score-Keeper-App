//
//  ContentView.swift
//  Score-Keeper Watch App
//
//  Created by Scott Harrison on 9/15/23.
//

import SwiftUI
import Foundation

enum AddOrSub {
    case ADD
    case SUB
    case RESET
    case GETDATA
}
struct Player:Codable {
    var player1: Double
    var player2: Double
}

struct PlayerSend:Encodable {
    var player1: Double
    var player2: Double
}


struct ContentView: View {
    
    @State private var player1 = 0.0
    @State private var player2 = 0.0
    @State private var showAlert = false
    @State private var offline = UserDefaults.standard.bool(forKey: "offline");
    
    func sendPutRequest(playerNum: Double, mode: AddOrSub) {
        guard let url = URL(string: "https://corona-sdk-4-82825584.firebaseio.com/matchScore.json") else {
            return
        }
        
        var request2 = URLRequest(url: url)
        request2.httpMethod = "GET"
        
        if(offline){
            if(playerNum == 1){
                if(mode == AddOrSub.ADD){
                    player1 += 1
                }else if(player1 > 0){
                    player1 -= 1
                }
            }
            if(playerNum == 2){
                if(mode == AddOrSub.ADD){
                    player2 += 1
                }else if(player2 > 0){
                    player2 -= 1
                }
            }
            if(playerNum == 3){
                player1 = 0
                player2 = 0
            }
            return
        }
        URLSession.shared.dataTask(with: request2) { data, response, error in
            if let error = error {
                print("Error: \(error.localizedDescription)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    let decoder = JSONDecoder()

                    if let data = data{
                        do{
                            var playerData = try decoder.decode(Player.self, from: data)
                            if(playerNum == 1){
                                if(mode == AddOrSub.ADD){
                                    playerData.player1 += 1
                                }else if(playerData.player1 > 0){
                                    playerData.player1 -= 1
                                }
                            }
                            if(playerNum == 2){
                                if(mode == AddOrSub.ADD){
                                    playerData.player2 += 1
                                }else if(playerData.player2 > 0){
                                    playerData.player2 -= 1
                                }
                            }
                            if(playerNum == 3){
                                playerData.player1 = 0
                                playerData.player2 = 0
                            }
                            player1 = playerData.player1
                            player2 = playerData.player2
                            var request = URLRequest(url: url)
                            let yourData = PlayerSend(player1: playerData.player1, player2: playerData.player2)
                            do {
                                let encoder = JSONEncoder()
                                request.httpBody = try encoder.encode(yourData)
                            } catch {
                                print("Error encoding JSON: \(error.localizedDescription)")
                                return
                            }
                            request.httpMethod = "PUT"
                            URLSession.shared.dataTask(with: request) { data, response, error in
                            if let error = error {
                                print("Error: \(error.localizedDescription)")
                                return
                            }
            
                            if let httpResponse = response as? HTTPURLResponse {
                                if httpResponse.statusCode == 200 {
                                    // PUT request was successful
                                    print("PUT Request Successful")
                                    WKInterfaceDevice.current().play(.success)
                                } else {
                                    print("Status Code: \(httpResponse.statusCode)")
                                }
                            }
                            }.resume()
                        }catch{
                            print("error loading data")
                        }
                    }
                }
                

            }
        }.resume()
        
    }
   var body: some View {
       SwiftUI.Group{
           TabView{
               HStack {
                   VStack {
                       Text("Home \(Int(player1))").foregroundColor(Color(hex:"#FF10F0")).font(.title3)
                       Button(action: {
                           sendPutRequest(playerNum: 1, mode:AddOrSub.ADD)
                       }) {
                           Image(systemName: "plus.circle")
                               .font(.largeTitle)
                       }
                       .padding()
                       Button(action: {
                           sendPutRequest(playerNum: 1, mode:AddOrSub.SUB)
                       }) {
                           Image(systemName: "minus.circle")
                               .font(.largeTitle)
                       }
                       .padding()
                       
                       
                   }
                   VStack {
                       Button(action: {
                           showAlert = true
                       }) {
                           Image(systemName: "arrow.clockwise.circle")
                               .font(.title2).padding(0)
                       }.alert(isPresented: $showAlert) {
                           Alert(
                            title: Text("Score Reset"),
                            message: Text("You are about to reset the score!"),
                            primaryButton: .default(Text("OK")) {
                                sendPutRequest(playerNum: 3, mode:AddOrSub.RESET)
                            },
                            secondaryButton: .cancel()
                           )
                       }.buttonStyle(PlainButtonStyle())
                       
                       
                   }
                   VStack {
                       Text("Away \(Int(player2))").foregroundColor(Color(hex:"#00FFFF")).font(.title3)
                       Button(action: {
                           sendPutRequest(playerNum: 2, mode:AddOrSub.ADD)
                       }) {
                           Image(systemName: "plus.circle")
                               .font(.largeTitle)
                       }
                       .padding()
                       
                       Button(action: {
                           sendPutRequest(playerNum: 2, mode:AddOrSub.SUB)
                       }) {
                           Image(systemName: "minus.circle")
                               .font(.largeTitle)
                       }
                       .padding()
                       
                   }
               }
               VStack {
                   Toggle(isOn: $offline) {
                       Text("Enable Offline Mode")
                   }.onChange(of: offline) { newValue in
                       UserDefaults.standard.set(offline, forKey: "offline")
                   }.padding()
                   Button(action: {
                       sendPutRequest(playerNum: 4, mode:AddOrSub.GETDATA)
                   }) {
                       Text("Get Data")
                       Image(systemName: "arrow.clockwise.circle")
                           .font(.title).padding(0)
                   }.buttonStyle(PlainButtonStyle())
               }
           }
       }
      
   }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}


extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
