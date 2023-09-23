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
    func sendPutRequest(playerNum: Double, mode: AddOrSub) {
        guard let url = URL(string: "https://corona-sdk-4-82825584.firebaseio.com/matchScore.json") else {
            return
        }
        
        var request2 = URLRequest(url: url)
        request2.httpMethod = "GET"
        

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
       HStack {
           VStack {
               Text("Home \(Int(player1))")
               Button(action: {
                   sendPutRequest(playerNum: 1, mode:AddOrSub.ADD)
               }) {
                   Image(systemName: "plus.circle")
                       .font(.largeTitle)
               }
               .padding()
               Button(action: {
                   sendPutRequest(playerNum: 3, mode:AddOrSub.SUB)
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
                       .font(.largeTitle)
               }.alert(isPresented: $showAlert) {
                   Alert(
                       title: Text("Score Reset"),
                       message: Text("You are about to reset the score!"),
                       primaryButton: .default(Text("OK")) {
                           sendPutRequest(playerNum: 3, mode:AddOrSub.RESET)
                       },
                       secondaryButton: .cancel()
                   )
               }

               
           }
           VStack {
               Text("Away \(Int(player2))")
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
   }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
